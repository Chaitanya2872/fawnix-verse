package com.hirepath.recruitment.controller;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.recruitment.client.FormsClient;
import com.hirepath.recruitment.client.dto.FormDetailResponse;
import com.hirepath.recruitment.domain.ApplicationFormSubmission;
import com.hirepath.recruitment.domain.Candidate;
import com.hirepath.recruitment.domain.CandidateApplication;
import com.hirepath.recruitment.domain.CandidateStatus;
import com.hirepath.recruitment.domain.JobPosition;
import com.hirepath.recruitment.repository.ApplicationFormSubmissionRepository;
import com.hirepath.recruitment.repository.CandidateApplicationRepository;
import com.hirepath.recruitment.repository.CandidateRepository;
import com.hirepath.recruitment.repository.JobPositionRepository;
import com.hirepath.recruitment.service.StorageService;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import feign.FeignException;

@RestController
@RequestMapping("/api/public/forms")
public class PublicApplyController {

    private final FormsClient formsClient;
    private final JobPositionRepository jobPositionRepository;
    private final CandidateRepository candidateRepository;
    private final CandidateApplicationRepository applicationRepository;
    private final ApplicationFormSubmissionRepository submissionRepository;
    private final StorageService storageService;

    public PublicApplyController(
        FormsClient formsClient,
        JobPositionRepository jobPositionRepository,
        CandidateRepository candidateRepository,
        CandidateApplicationRepository applicationRepository,
        ApplicationFormSubmissionRepository submissionRepository,
        StorageService storageService
    ) {
        this.formsClient = formsClient;
        this.jobPositionRepository = jobPositionRepository;
        this.candidateRepository = candidateRepository;
        this.applicationRepository = applicationRepository;
        this.submissionRepository = submissionRepository;
        this.storageService = storageService;
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
    public ResponseEntity<?> submit(@PathVariable String slug, MultipartHttpServletRequest request) {
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

        Candidate candidate = candidateRepository.findByEmail(email).orElse(null);
        if (candidate != null) {
            CandidateApplication existing = applicationRepository
                .findByCandidate_IdAndPosition_Id(candidate.getId(), position.getId())
                .orElse(null);
            if (existing != null) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("Application already exists for this position");
            }
        }

        if (candidate == null) {
            candidate = new Candidate();
            candidate.setFullName(fullName);
            candidate.setEmail(email);
            candidate.setPhone(stringValue(answers.get("phone")));
            candidate.setLocation(stringValue(answers.get("location")));
            candidate.setLinkedinUrl(stringValue(answers.get("linkedin_url")));
            candidate.setPortfolioUrl(stringValue(answers.get("portfolio_url")));
            candidate.setResumeUrl(resumeUrl);
            candidate.setSource("public_form");
            candidateRepository.save(candidate);
        } else {
            if (!StringUtils.hasText(candidate.getFullName())) {
                candidate.setFullName(fullName);
            }
            if (!StringUtils.hasText(candidate.getPhone())) {
                candidate.setPhone(stringValue(answers.get("phone")));
            }
            if (!StringUtils.hasText(candidate.getLocation())) {
                candidate.setLocation(stringValue(answers.get("location")));
            }
            if (!StringUtils.hasText(candidate.getLinkedinUrl())) {
                candidate.setLinkedinUrl(stringValue(answers.get("linkedin_url")));
            }
            if (!StringUtils.hasText(candidate.getPortfolioUrl())) {
                candidate.setPortfolioUrl(stringValue(answers.get("portfolio_url")));
            }
            if (resumeUrl != null) {
                candidate.setResumeUrl(resumeUrl);
            }
            candidateRepository.save(candidate);
        }

        CandidateApplication application = new CandidateApplication();
        application.setCandidate(candidate);
        application.setPosition(position);
        application.setStatus(CandidateStatus.APPLIED);
        application.setConsentGiven(true);
        applicationRepository.save(application);

        ApplicationFormSubmission submission = new ApplicationFormSubmission();
        submission.setFormId(form.getId());
        submission.setFormName(form.getName());
        submission.setCandidate(candidate);
        submission.setApplication(application);
        submission.setAnswers(answers);
        submission.setResumeUrl(resumeUrl);
        submission.setSource("public_form");
        submissionRepository.save(submission);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Application submitted"));
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }
}
