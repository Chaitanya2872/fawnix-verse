package com.hirepath.forms.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import com.hirepath.forms.client.NotificationsClient;
import com.hirepath.forms.client.dto.NotificationEventRequest;
import com.hirepath.forms.domain.ApplicationFormLink;
import com.hirepath.forms.domain.ApplicationForm;
import com.hirepath.forms.domain.ApplicationFormField;
import com.hirepath.forms.domain.ApplicationFormSubmission;
import com.hirepath.forms.domain.ApplicationFormSubmissionResponse;
import com.hirepath.forms.domain.ApplicationFormVersion;
import com.hirepath.forms.domain.FormLinkStatus;
import com.hirepath.forms.dto.InternalFormSubmissionRequest;
import com.hirepath.forms.repository.ApplicationFormLinkRepository;
import com.hirepath.forms.repository.ApplicationFormRepository;
import com.hirepath.forms.repository.ApplicationFormSubmissionRepository;
import com.hirepath.forms.repository.ApplicationFormSubmissionResponseRepository;
import com.hirepath.forms.repository.ApplicationFormVersionRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class FormSubmissionService {

    private static final Logger log = LoggerFactory.getLogger(FormSubmissionService.class);

    private final ApplicationFormVersionRepository versionRepository;
    private final ApplicationFormRepository formRepository;
    private final ApplicationFormSubmissionRepository submissionRepository;
    private final ApplicationFormSubmissionResponseRepository responseRepository;
    private final ApplicationFormLinkRepository linkRepository;
    private final NotificationsClient notificationsClient;

    public FormSubmissionService(
        ApplicationFormVersionRepository versionRepository,
        ApplicationFormRepository formRepository,
        ApplicationFormSubmissionRepository submissionRepository,
        ApplicationFormSubmissionResponseRepository responseRepository,
        ApplicationFormLinkRepository linkRepository,
        NotificationsClient notificationsClient
    ) {
        this.versionRepository = versionRepository;
        this.formRepository = formRepository;
        this.submissionRepository = submissionRepository;
        this.responseRepository = responseRepository;
        this.linkRepository = linkRepository;
        this.notificationsClient = notificationsClient;
    }

    public SubmissionResult createSubmission(InternalFormSubmissionRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request is required");
        }
        if (request.getIdempotencyKey() == null || request.getIdempotencyKey().isBlank()) {
            throw new IllegalArgumentException("idempotency_key is required");
        }

        Optional<ApplicationFormSubmission> existingSubmission =
            submissionRepository.findByIdempotencyKey(request.getIdempotencyKey());
        if (existingSubmission.isPresent()) {
            return SubmissionResult.deduplicated(existingSubmission.get().getId());
        }

        UUID formId = parseUuid(request.getFormId(), "form_id");
        UUID versionId = request.getFormVersionId() != null && !request.getFormVersionId().isBlank()
            ? parseUuid(request.getFormVersionId(), "form_version_id")
            : null;

        ApplicationFormVersion version = versionId != null
            ? versionRepository.findById(versionId).orElse(null)
            : versionRepository.findTopByFormIdOrderByCreatedAtDesc(formId).orElse(null);
        if (version == null) {
            version = createVersionSnapshot(formId);
        }
        if (version == null) {
            throw new IllegalArgumentException("Form version not found");
        }

        validateLink(request.getLinkSlug());

        ApplicationFormSubmission submission = new ApplicationFormSubmission();
        submission.setFormId(formId);
        submission.setFormVersionId(version.getId());
        submission.setFormName(request.getFormName());
        submission.setCandidateId(parseUuidOrNull(request.getCandidateId()));
        submission.setCandidateName(request.getCandidateName());
        submission.setCandidateEmail(request.getCandidateEmail());
        submission.setApplicationId(parseUuidOrNull(request.getApplicationId()));
        submission.setAnswers(request.getAnswers() != null ? request.getAnswers() : Map.of());
        submission.setSchemaSnapshot(version.getSchemaSnapshot());
        submission.setResumeUrl(request.getResumeUrl());
        submission.setSource(request.getSource());
        submission.setIdempotencyKey(request.getIdempotencyKey());
        submission.setSubmittedAt(request.getSubmittedAt() != null ? request.getSubmittedAt() : OffsetDateTime.now());

        ApplicationFormSubmission saved;
        try {
            saved = submissionRepository.save(submission);
        } catch (DataIntegrityViolationException ex) {
            ApplicationFormSubmission duplicate = submissionRepository.findByIdempotencyKey(request.getIdempotencyKey())
                .orElse(null);
            if (duplicate != null) {
                return SubmissionResult.deduplicated(duplicate.getId());
            }
            throw ex;
        }
        persistResponses(saved, version.getSchemaSnapshot());
        updateLinkUsage(request.getLinkSlug());
        emitEvent(saved);

        return SubmissionResult.created(saved.getId());
    }

    private void validateLink(String linkSlug) {
        if (linkSlug == null || linkSlug.isBlank()) {
            return;
        }
        ApplicationFormLink link = linkRepository.findBySlug(linkSlug).orElseThrow(
            () -> new IllegalArgumentException("Link not found")
        );
        if (!link.isActive() || link.getStatus() == FormLinkStatus.DISABLED) {
            throw new IllegalStateException("Link is disabled");
        }
        if (link.getExpiresAt() != null && link.getExpiresAt().isBefore(OffsetDateTime.now())) {
            link.setStatus(FormLinkStatus.EXPIRED);
            link.setActive(false);
            linkRepository.save(link);
            throw new IllegalStateException("Link is expired");
        }
        if (link.getMaxSubmissions() != null && link.getCurrentSubmissions() >= link.getMaxSubmissions()) {
            link.setStatus(FormLinkStatus.DISABLED);
            link.setActive(false);
            linkRepository.save(link);
            throw new IllegalStateException("Link has reached submission limit");
        }
    }

    private void updateLinkUsage(String linkSlug) {
        if (linkSlug == null || linkSlug.isBlank()) {
            return;
        }
        ApplicationFormLink link = linkRepository.findBySlug(linkSlug).orElse(null);
        if (link == null) {
            return;
        }
        link.setCurrentSubmissions(link.getCurrentSubmissions() + 1);
        if (link.getMaxSubmissions() != null && link.getCurrentSubmissions() >= link.getMaxSubmissions()) {
            link.setStatus(FormLinkStatus.DISABLED);
            link.setActive(false);
        }
        linkRepository.save(link);
    }

    private void persistResponses(ApplicationFormSubmission submission, Object schemaSnapshot) {
        if (!(schemaSnapshot instanceof List<?> fields)) {
            return;
        }
        Map<String, Object> answers = submission.getAnswers();
        List<ApplicationFormSubmissionResponse> responses = new ArrayList<>();
        for (Object rawField : fields) {
            if (!(rawField instanceof Map<?, ?> field)) {
                continue;
            }
            String fieldKey = Objects.toString(field.get("field_key"), null);
            if (fieldKey == null) {
                continue;
            }
            Object answer = answers.get(fieldKey);
            if (answer == null) {
                continue;
            }
            String fieldType = Objects.toString(field.get("type"), null);
            ApplicationFormSubmissionResponse response = new ApplicationFormSubmissionResponse();
            response.setSubmissionId(submission.getId());
            response.setFieldKey(fieldKey);
            response.setFieldType(fieldType);
            applyAnswer(response, fieldType, answer);
            responses.add(response);
        }
        if (!responses.isEmpty()) {
            responseRepository.saveAll(responses);
        }
    }

    private ApplicationFormVersion createVersionSnapshot(UUID formId) {
        ApplicationForm form = formRepository.findById(formId).orElse(null);
        if (form == null) {
            return null;
        }
        List<Map<String, Object>> snapshot = form.getFields().stream()
            .sorted((a, b) -> {
                Integer left = a.getOrderIndex() != null ? a.getOrderIndex() : 0;
                Integer right = b.getOrderIndex() != null ? b.getOrderIndex() : 0;
                return left.compareTo(right);
            })
            .map(this::fieldToMap)
            .toList();
        ApplicationFormVersion version = new ApplicationFormVersion();
        version.setFormId(formId);
        version.setVersion(form.getVersion() != null ? form.getVersion() : "v1.0");
        version.setSchemaSnapshot(snapshot);
        return versionRepository.save(version);
    }

    private Map<String, Object> fieldToMap(ApplicationFormField field) {
        Map<String, Object> row = new java.util.LinkedHashMap<>();
        row.put("field_key", field.getFieldKey());
        row.put("label", field.getLabel());
        row.put("type", field.getType() != null ? field.getType().name().toLowerCase() : null);
        row.put("required", field.isRequired());
        row.put("options", field.getOptions());
        row.put("config", field.getConfig() != null ? field.getConfig() : Map.of());
        row.put("order", field.getOrderIndex());
        return row;
    }

    private void applyAnswer(ApplicationFormSubmissionResponse response, String fieldType, Object answer) {
        if (answer instanceof List<?> list) {
            response.setValueText(list.stream().map(String::valueOf).reduce((a, b) -> a + ", " + b).orElse(""));
            return;
        }
        String value = String.valueOf(answer);
        if (value.isBlank()) {
            return;
        }
        if ("number".equalsIgnoreCase(fieldType)) {
            try {
                response.setValueNumber(new BigDecimal(value));
                return;
            } catch (NumberFormatException ignored) {
                // fallthrough to text
            }
        }
        if ("date".equalsIgnoreCase(fieldType)) {
            try {
                response.setValueDate(LocalDate.parse(value));
                return;
            } catch (DateTimeParseException ignored) {
                // fallthrough to text
            }
        }
        response.setValueText(value);
    }

    private void emitEvent(ApplicationFormSubmission submission) {
        if (submission.getCandidateEmail() == null || submission.getCandidateEmail().isBlank()) {
            return;
        }
        try {
            NotificationEventRequest request = new NotificationEventRequest();
            request.setTenantId("default");
            request.setModule("forms");
            request.setEventType("forms.submission.received");
            request.setRecipients(List.of(buildRecipient(submission.getCandidateEmail())));
            request.setContent(buildContent(submission));
            request.setIdempotencyKey(submission.getIdempotencyKey());
            request.setVariables(Map.of(
                "form_id", submission.getFormId().toString(),
                "form_version_id", submission.getFormVersionId().toString(),
                "candidate_email", submission.getCandidateEmail(),
                "candidate_name", submission.getCandidateName() != null ? submission.getCandidateName() : ""
            ));
            notificationsClient.sendEvent(request);
        } catch (Exception ex) {
            log.warn("Failed to emit submission event", ex);
        }
    }

    private NotificationEventRequest.RecipientTarget buildRecipient(String email) {
        NotificationEventRequest.RecipientTarget target = new NotificationEventRequest.RecipientTarget();
        target.setEmail(email);
        return target;
    }

    private NotificationEventRequest.NotificationContent buildContent(ApplicationFormSubmission submission) {
        NotificationEventRequest.NotificationContent content = new NotificationEventRequest.NotificationContent();
        content.setTitle("Application received");
        content.setBody("Your application for " + (submission.getFormName() != null ? submission.getFormName() : "the form") + " was received.");
        return content;
    }

    private UUID parseUuid(String value, String field) {
        try {
            return UUID.fromString(value);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid " + field);
        }
    }

    private UUID parseUuidOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (Exception ex) {
            return null;
        }
    }

    public record SubmissionResult(UUID id, boolean deduplicated) {
        public static SubmissionResult created(UUID id) {
            return new SubmissionResult(id, false);
        }

        public static SubmissionResult deduplicated(UUID id) {
            return new SubmissionResult(id, true);
        }
    }
}
