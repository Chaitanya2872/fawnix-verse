package com.hirepath.recruitment.controller;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.recruitment.client.FormsClient;
import com.hirepath.recruitment.client.dto.FormDetailResponse;
import com.hirepath.recruitment.client.dto.InternalFormSubmissionRequest;
import com.hirepath.recruitment.domain.CandidateIntake;
import com.hirepath.recruitment.domain.IntakeStatus;
import com.hirepath.recruitment.domain.JobPosition;
import com.hirepath.recruitment.repository.CandidateIntakeRepository;
import com.hirepath.recruitment.repository.JobPositionRepository;
import com.hirepath.recruitment.service.StorageService;
import com.hirepath.recruitment.service.RecruitmentEventService;
import com.hirepath.recruitment.util.PublicFormRateLimiter;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import feign.FeignException;

@RestController
@RequestMapping("/api/public/forms")
public class PublicApplyController {

    private final FormsClient formsClient;
    private final JobPositionRepository jobPositionRepository;
    private final CandidateIntakeRepository intakeRepository;
    private final StorageService storageService;
    private final PublicFormRateLimiter rateLimiter;
    private final RecruitmentEventService eventService;

    public PublicApplyController(
        FormsClient formsClient,
        JobPositionRepository jobPositionRepository,
        CandidateIntakeRepository intakeRepository,
        StorageService storageService,
        PublicFormRateLimiter rateLimiter,
        RecruitmentEventService eventService
    ) {
        this.formsClient = formsClient;
        this.jobPositionRepository = jobPositionRepository;
        this.intakeRepository = intakeRepository;
        this.storageService = storageService;
        this.rateLimiter = rateLimiter;
        this.eventService = eventService;
    }

    @GetMapping("/{slug}")
    public ResponseEntity<?> getPublicForm(@PathVariable String slug) {
        FormDetailResponse form;
        try {
            form = formsClient.getFormBySlug(slug);
        } catch (FeignException.NotFound ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Form not found");
        } catch (FeignException ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Unable to fetch form");
        }
        if (form == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Form not found");
        }

        String positionTitle = null;
        if (StringUtils.hasText(form.getPositionId())) {
            JobPosition position = jobPositionRepository.findById(UUID.fromString(form.getPositionId())).orElse(null);
            if (position != null) {
                positionTitle = position.getTitle();
            }
        }

        List<FormDetailResponse.FormFieldResponse> fields = form.getFields() != null
            ? form.getFields().stream()
                .sorted(Comparator.comparing(f -> f.getOrder() == null ? 0 : f.getOrder()))
                .toList()
            : List.of();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", form.getId());
        payload.put("name", form.getName());
        payload.put("description", form.getDescription());
        payload.put("position_title", positionTitle);
        payload.put("fields", fields.stream().map(field -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("field_key", field.getFieldKey());
            row.put("label", field.getLabel());
            row.put("type", field.getType());
            row.put("required", field.isRequired());
            row.put("options", field.getOptions());
            row.put("config", field.getConfig() != null ? field.getConfig() : Map.of());
            return row;
        }).toList());

        return ResponseEntity.ok(payload);
    }

    @PostMapping(value = "/{slug}/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> submit(
        @PathVariable String slug,
        MultipartHttpServletRequest request,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestParam(value = "link", required = false) String linkSlug
    ) {
        String clientIp = resolveClientIp(request);
        String rateKey = (linkSlug != null && !linkSlug.isBlank()) ? linkSlug + ":" + clientIp : slug + ":" + clientIp;
        var rateResult = rateLimiter.allow(rateKey);
        if (!rateResult.allowed()) {
            return ResponseEntity.status(429)
                .header("Retry-After", String.valueOf(rateResult.retryAfterSeconds()))
                .body("Rate limit exceeded");
        }
        FormDetailResponse form;
        try {
            form = formsClient.getFormBySlug(slug);
        } catch (FeignException.NotFound ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Form not found");
        } catch (FeignException ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Unable to fetch form");
        }
        if (form == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Form not found");
        }

        if (!StringUtils.hasText(form.getPositionId())) {
            return ResponseEntity.badRequest().body("Form missing position_id");
        }

        JobPosition position = jobPositionRepository.findById(UUID.fromString(form.getPositionId())).orElse(null);
        if (position == null) {
            return ResponseEntity.badRequest().body("Invalid position_id");
        }

        List<FormDetailResponse.FormFieldResponse> fields = form.getFields() != null
            ? form.getFields().stream()
                .sorted(Comparator.comparing(f -> f.getOrder() == null ? 0 : f.getOrder()))
                .toList()
            : List.of();

        Map<String, Object> answers = new LinkedHashMap<>();
        String resumeUrl = null;

        for (FormDetailResponse.FormFieldResponse field : fields) {
            String key = field.getFieldKey();
            String type = field.getType() != null ? field.getType().toLowerCase() : "";
            if ("section".equals(type)) {
                continue;
            }
            if ("file".equals(type)) {
                MultipartFile upload = request.getFile(key);
                if (upload != null && !upload.isEmpty()) {
                    resumeUrl = storageService.upload("resumes", upload);
                    answers.put(key, resumeUrl);
                }
                if (field.isRequired() && (upload == null || upload.isEmpty())) {
                    return ResponseEntity.badRequest().body(field.getLabel() + " is required");
                }
                continue;
            }
            if ("multiselect".equals(type) || "checkbox".equals(type)) {
                String[] values = request.getParameterValues(key);
                List<String> list = values != null ? List.of(values) : List.of();
                answers.put(key, list);
                if (field.isRequired() && list.isEmpty()) {
                    return ResponseEntity.badRequest().body(field.getLabel() + " is required");
                }
            } else {
                String value = request.getParameter(key);
                answers.put(key, value);
                if (field.isRequired() && (!StringUtils.hasText(value))) {
                    return ResponseEntity.badRequest().body(field.getLabel() + " is required");
                }
            }
        }

        String email = answers.get("email") != null ? answers.get("email").toString().trim() : "";
        String fullName = answers.get("full_name") != null ? answers.get("full_name").toString().trim() : "";
        if (!StringUtils.hasText(email) || !StringUtils.hasText(fullName)) {
            return ResponseEntity.badRequest().body("full_name and email are required");
        }

        String effectiveKey = StringUtils.hasText(idempotencyKey) ? idempotencyKey : UUID.randomUUID().toString();
        InternalFormSubmissionRequest internalRequest = new InternalFormSubmissionRequest();
        internalRequest.setFormId(form.getId());
        internalRequest.setFormVersionId(form.getFormVersionId());
        internalRequest.setFormName(form.getName());
        internalRequest.setCandidateId(null);
        internalRequest.setCandidateName(fullName);
        internalRequest.setCandidateEmail(email);
        internalRequest.setApplicationId(null);
        internalRequest.setAnswers(answers);
        internalRequest.setResumeUrl(resumeUrl);
        internalRequest.setSource("public_form");
        internalRequest.setIdempotencyKey(effectiveKey);
        internalRequest.setLinkSlug(linkSlug);
        internalRequest.setSubmittedAt(OffsetDateTime.now());

        try {
            Map<?, ?> submissionResult = (Map<?, ?>) formsClient.createSubmission(internalRequest);
            UUID submissionId = parseSubmissionId(submissionResult);
            CandidateIntake intake = buildIntake(position.getId(), form.getId(), submissionId, fullName, email, resumeUrl, answers, "public_form");
            String dedupeHash = intake.getDedupeHash();
            CandidateIntake existing = dedupeHash != null
                ? intakeRepository.findTopByVacancyIdAndDedupeHashOrderByCreatedAtDesc(position.getId(), dedupeHash).orElse(null)
                : null;
            if (existing != null) {
                intake.setDuplicateOfIntakeId(existing.getId());
                intake.setStatus(IntakeStatus.REJECTED);
                intakeRepository.save(intake);
                return ResponseEntity.status(HttpStatus.CONFLICT).body("Duplicate application detected");
            }
            CandidateIntake saved = intakeRepository.save(intake);
            eventService.audit("intake", saved.getId().toString(), "created", null, Map.of(
                "vacancy_id", position.getId(),
                "form_id", form.getId()
            ));
        } catch (FeignException ex) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            if (ex.status() == 410) {
                return ResponseEntity.status(HttpStatus.GONE).body("Link is expired or disabled");
            }
            if (ex.status() == 400) {
                return ResponseEntity.badRequest().body("Invalid submission payload");
            }
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Unable to persist submission");
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Application submitted"));
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private CandidateIntake buildIntake(UUID vacancyId, String formId, UUID submissionId, String fullName, String email, String resumeUrl, Map<String, Object> answers, String source) {
        CandidateIntake intake = new CandidateIntake();
        intake.setVacancyId(vacancyId);
        intake.setFormId(formId);
        intake.setFormSubmissionId(submissionId);
        intake.setCandidateName(fullName);
        intake.setEmail(email);
        intake.setPhone(stringValue(answers.get("phone")));
        intake.setResumeUrl(resumeUrl);
        intake.setSource(source);
        intake.setStatus(IntakeStatus.NEW);
        intake.setDedupeHash(buildDedupeHash(vacancyId, email));
        return intake;
    }

    private String buildDedupeHash(UUID vacancyId, String email) {
        if (vacancyId == null || email == null) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String raw = vacancyId + ":" + email.trim().toLowerCase();
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            return null;
        }
    }

    private UUID parseSubmissionId(Map<?, ?> submissionResult) {
        if (submissionResult == null) {
            return null;
        }
        Object id = submissionResult.get("id");
        if (id == null) {
            return null;
        }
        try {
            return UUID.fromString(id.toString());
        } catch (Exception ex) {
            return null;
        }
    }

    private String resolveClientIp(MultipartHttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
