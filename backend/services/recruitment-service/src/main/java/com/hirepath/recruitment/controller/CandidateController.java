package com.hirepath.recruitment.controller;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hirepath.recruitment.domain.ApplicationFormSubmission;
import com.hirepath.recruitment.domain.Candidate;
import com.hirepath.recruitment.domain.CandidateApplication;
import com.hirepath.recruitment.domain.CandidateStatus;
import com.hirepath.recruitment.domain.JobPosition;
import com.hirepath.recruitment.domain.UserRole;
import com.hirepath.recruitment.dto.ApplicationStatusUpdateRequest;
import com.hirepath.recruitment.dto.CandidateApplicationCreateRequest;
import com.hirepath.recruitment.dto.CandidateCreateRequest;
import com.hirepath.recruitment.repository.ApplicationFormSubmissionRepository;
import com.hirepath.recruitment.repository.CandidateApplicationRepository;
import com.hirepath.recruitment.repository.CandidateRepository;
import com.hirepath.recruitment.repository.JobPositionRepository;
import com.hirepath.recruitment.util.UserContext;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.hirepath.recruitment.security.service.AppUserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/candidates")
public class CandidateController {

    private final CandidateRepository candidateRepository;
    private final CandidateApplicationRepository candidateApplicationRepository;
    private final JobPositionRepository jobPositionRepository;
    private final ApplicationFormSubmissionRepository submissionRepository;

    public CandidateController(
        CandidateRepository candidateRepository,
        CandidateApplicationRepository candidateApplicationRepository,
        JobPositionRepository jobPositionRepository,
        ApplicationFormSubmissionRepository submissionRepository
    ) {
        this.candidateRepository = candidateRepository;
        this.candidateApplicationRepository = candidateApplicationRepository;
        this.jobPositionRepository = jobPositionRepository;
        this.submissionRepository = submissionRepository;
    }

    @GetMapping
    public ResponseEntity<?> listCandidates(
        @RequestParam(value = "search", required = false) String search,
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "skills", required = false) String skills,
        @RequestParam(value = "skip", defaultValue = "0") int skip,
        @RequestParam(value = "limit", defaultValue = "20") int limit,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        List<Candidate> candidates = candidateRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        if (search != null && !search.isBlank()) {
            String needle = search.toLowerCase();
            candidates = candidates.stream()
                .filter(c -> (c.getFullName() != null && c.getFullName().toLowerCase().contains(needle))
                    || (c.getEmail() != null && c.getEmail().toLowerCase().contains(needle)))
                .toList();
        }

        int total = candidates.size();
        int fromIndex = Math.min(skip, total);
        int toIndex = Math.min(fromIndex + limit, total);
        List<Candidate> page = candidates.subList(fromIndex, toIndex);

        List<Map<String, Object>> data = page.stream().map(candidate -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", candidate.getId());
            row.put("full_name", candidate.getFullName());
            row.put("email", candidate.getEmail());
            row.put("phone", candidate.getPhone());
            row.put("location", candidate.getLocation());
            row.put("skills", candidate.getSkills());
            row.put("experience_years", candidate.getExperienceYears());
            row.put("current_title", candidate.getCurrentTitle());
            row.put("source", candidate.getSource());
            row.put("ai_match_score", candidate.getAiMatchScore());
            row.put("is_in_talent_pool", candidate.isInTalentPool());
            row.put("created_at", candidate.getCreatedAt());
            return row;
        }).toList();

        return ResponseEntity.ok(Map.of("total", total, "data", data));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createCandidate(@RequestBody CandidateCreateRequest request, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body("Email is required");
        }
        if (candidateRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Candidate with this email already exists");
        }
        Candidate candidate = new Candidate();
        candidate.setFullName(request.getFullName());
        candidate.setEmail(request.getEmail());
        candidate.setPhone(request.getPhone());
        candidate.setLocation(request.getLocation());
        candidate.setLinkedinUrl(request.getLinkedinUrl());
        candidate.setPortfolioUrl(request.getPortfolioUrl());
        candidate.setSkills(request.getSkills());
        candidate.setExperienceYears(request.getExperienceYears());
        candidate.setCurrentCompany(request.getCurrentCompany());
        candidate.setCurrentTitle(request.getCurrentTitle());
        candidate.setSource(request.getSource() != null ? request.getSource() : "direct");
        candidate.setNotes(request.getNotes());

        Candidate saved = candidateRepository.save(candidate);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", saved.getId(), "message", "Candidate created"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCandidate(@PathVariable String id, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        Candidate candidate = candidateRepository.findById(UUID.fromString(id)).orElse(null);
        if (candidate == null) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", candidate.getId());
        row.put("full_name", candidate.getFullName());
        row.put("email", candidate.getEmail());
        row.put("phone", candidate.getPhone());
        row.put("location", candidate.getLocation());
        row.put("linkedin_url", candidate.getLinkedinUrl());
        row.put("portfolio_url", candidate.getPortfolioUrl());
        row.put("resume_url", candidate.getResumeUrl());
        row.put("skills", candidate.getSkills());
        row.put("experience_years", candidate.getExperienceYears());
        row.put("current_company", candidate.getCurrentCompany());
        row.put("current_title", candidate.getCurrentTitle());
        row.put("education", candidate.getEducation());
        row.put("tags", candidate.getTags());
        row.put("source", candidate.getSource());
        row.put("notes", candidate.getNotes());
        row.put("ai_match_score", candidate.getAiMatchScore());
        row.put("is_in_talent_pool", candidate.isInTalentPool());
        row.put("created_at", candidate.getCreatedAt());
        row.put("updated_at", candidate.getUpdatedAt());
        return ResponseEntity.ok(row);
    }

    @GetMapping("/pipeline/all")
    public ResponseEntity<?> pipeline(
        @RequestParam(value = "position_id", required = false) String positionId,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        List<CandidateApplication> applications = positionId != null && !positionId.isBlank()
            ? candidateApplicationRepository.findByPosition_Id(UUID.fromString(positionId))
            : candidateApplicationRepository.findAll();

        Map<String, List<Map<String, Object>>> pipeline = new LinkedHashMap<>();
        for (CandidateStatus status : CandidateStatus.values()) {
            pipeline.put(status.getValue(), new java.util.ArrayList<>());
        }

        for (CandidateApplication application : applications) {
            Candidate candidate = application.getCandidate();
            if (candidate == null) {
                continue;
            }
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("application_id", application.getId());
            entry.put("candidate_id", candidate.getId());
            entry.put("full_name", candidate.getFullName());
            entry.put("email", candidate.getEmail());
            entry.put("current_title", candidate.getCurrentTitle());
            entry.put("skills", candidate.getSkills());
            entry.put("applied_at", application.getAppliedAt());
            entry.put("status", application.getStatus() != null ? application.getStatus().getValue() : null);
            String key = application.getStatus() != null ? application.getStatus().getValue() : CandidateStatus.APPLIED.getValue();
            pipeline.computeIfAbsent(key, k -> new java.util.ArrayList<>()).add(entry);
        }
        return ResponseEntity.ok(pipeline);
    }

    @PostMapping("/applications")
    @Transactional
    public ResponseEntity<?> createApplication(
        @RequestBody CandidateApplicationCreateRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        if (request.getCandidateId() == null || request.getCandidateId().isBlank()) {
            return ResponseEntity.badRequest().body("candidate_id is required");
        }
        if (request.getPositionId() == null || request.getPositionId().isBlank()) {
            return ResponseEntity.badRequest().body("position_id is required");
        }

        Candidate candidate = candidateRepository.findById(UUID.fromString(request.getCandidateId())).orElse(null);
        if (candidate == null) {
            return ResponseEntity.badRequest().body("Invalid candidate_id");
        }
        JobPosition position = jobPositionRepository.findById(UUID.fromString(request.getPositionId())).orElse(null);
        if (position == null) {
            return ResponseEntity.badRequest().body("Invalid position_id");
        }

        CandidateApplication application = new CandidateApplication();
        application.setCandidate(candidate);
        application.setPosition(position);
        application.setCoverLetter(request.getCoverLetter());
        application.setSalaryExpectation(request.getSalaryExpectation());
        application.setNoticePeriodDays(request.getNoticePeriodDays());
        application.setConsentGiven(request.isConsentGiven());

        CandidateApplication saved = candidateApplicationRepository.save(application);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", saved.getId(), "message", "Application created"));
    }

    @GetMapping("/applications")
    public ResponseEntity<?> listApplications(
        @RequestParam(value = "form_id", required = false) String formId,
        @RequestParam(value = "candidate_id", required = false) String candidateId,
        @RequestParam(value = "position_id", required = false) String positionId,
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "source", required = false) String source,
        @RequestParam(value = "date_from", required = false) String dateFrom,
        @RequestParam(value = "date_to", required = false) String dateTo,
        @RequestParam(value = "skills", required = false) String skills,
        @RequestParam(value = "min_experience", required = false) Integer minExperience,
        @RequestParam(value = "max_experience", required = false) Integer maxExperience,
        @RequestParam(value = "search", required = false) String search,
        @RequestParam(value = "skip", defaultValue = "0") int skip,
        @RequestParam(value = "limit", defaultValue = "50") int limit,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        List<ApplicationFormSubmission> submissions = submissionRepository.findAll();

        if (formId != null && !formId.isBlank()) {
            submissions = submissions.stream()
                .filter(submission -> formId.equals(submission.getFormId()))
                .toList();
        }
        if (candidateId != null && !candidateId.isBlank()) {
            submissions = submissions.stream()
                .filter(submission -> submission.getCandidate() != null
                    && candidateId.equals(submission.getCandidate().getId().toString()))
                .toList();
        }
        if (positionId != null && !positionId.isBlank()) {
            submissions = submissions.stream()
                .filter(submission -> submission.getApplication() != null
                    && submission.getApplication().getPosition() != null
                    && positionId.equals(submission.getApplication().getPosition().getId().toString()))
                .toList();
        }
        if (status != null && !status.isBlank()) {
            List<String> statuses = Arrays.stream(status.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
            submissions = submissions.stream()
                .filter(submission -> submission.getApplication() != null
                    && submission.getApplication().getStatus() != null
                    && statuses.contains(submission.getApplication().getStatus().getValue()))
                .toList();
        }
        if (source != null && !source.isBlank()) {
            submissions = submissions.stream()
                .filter(submission -> source.equalsIgnoreCase(submission.getSource()))
                .toList();
        }
        if (minExperience != null) {
            submissions = submissions.stream()
                .filter(submission -> submission.getCandidate() != null
                    && submission.getCandidate().getExperienceYears() != null
                    && submission.getCandidate().getExperienceYears() >= minExperience)
                .toList();
        }
        if (maxExperience != null) {
            submissions = submissions.stream()
                .filter(submission -> submission.getCandidate() != null
                    && submission.getCandidate().getExperienceYears() != null
                    && submission.getCandidate().getExperienceYears() <= maxExperience)
                .toList();
        }
        if (skills != null && !skills.isBlank()) {
            List<String> skillValues = Arrays.stream(skills.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
            submissions = submissions.stream()
                .filter(submission -> submission.getCandidate() != null
                    && submission.getCandidate().getSkills() != null
                    && submission.getCandidate().getSkills().stream().anyMatch(skillValues::contains))
                .toList();
        }
        if (search != null && !search.isBlank()) {
            String pattern = search.toLowerCase();
            submissions = submissions.stream()
                .filter(submission -> submission.getCandidate() != null
                    && ((submission.getCandidate().getFullName() != null
                        && submission.getCandidate().getFullName().toLowerCase().contains(pattern))
                        || (submission.getCandidate().getEmail() != null
                            && submission.getCandidate().getEmail().toLowerCase().contains(pattern))))
                .toList();
        }

        OffsetDateTime from = parseDate(dateFrom, false);
        OffsetDateTime to = parseDate(dateTo, true);
        if (from != null) {
            submissions = submissions.stream()
                .filter(submission -> submission.getSubmittedAt() != null && !submission.getSubmittedAt().isBefore(from))
                .toList();
        }
        if (to != null) {
            submissions = submissions.stream()
                .filter(submission -> submission.getSubmittedAt() != null && submission.getSubmittedAt().isBefore(to))
                .toList();
        }

        int total = submissions.size();
        submissions = submissions.stream()
            .sorted(Comparator.comparing(ApplicationFormSubmission::getSubmittedAt).reversed())
            .collect(Collectors.toList());
        int fromIndex = Math.min(skip, total);
        int toIndex = Math.min(fromIndex + limit, total);
        List<ApplicationFormSubmission> page = submissions.subList(fromIndex, toIndex);

        List<Map<String, Object>> data = page.stream().map(submission -> {
            CandidateApplication application = submission.getApplication();
            Candidate candidate = submission.getCandidate();
            JobPosition position = application != null ? application.getPosition() : null;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("submission_id", submission.getId());
            row.put("application_id", application != null ? application.getId() : null);
            row.put("candidate_id", candidate != null ? candidate.getId() : null);
            row.put("candidate_name", candidate != null ? candidate.getFullName() : null);
            row.put("candidate_email", candidate != null ? candidate.getEmail() : null);
            row.put("candidate_phone", candidate != null ? candidate.getPhone() : null);
            row.put("candidate_location", candidate != null ? candidate.getLocation() : null);
            row.put("skills", candidate != null && candidate.getSkills() != null ? candidate.getSkills() : List.of());
            row.put("experience_years", candidate != null ? candidate.getExperienceYears() : null);
            row.put("status", application != null && application.getStatus() != null ? application.getStatus().getValue() : null);
            row.put("notes", application != null ? application.getNotes() : null);
            row.put("source", submission.getSource() != null ? submission.getSource() : (candidate != null ? candidate.getSource() : null));
            row.put("submitted_at", submission.getSubmittedAt());
            row.put("form_id", submission.getFormId());
            row.put("form_name", submission.getFormName());
            row.put("position_id", position != null ? position.getId() : null);
            row.put("position_title", position != null ? position.getTitle() : null);
            row.put("resume_url", submission.getResumeUrl() != null ? submission.getResumeUrl()
                : (candidate != null ? candidate.getResumeUrl() : null));
            return row;
        }).toList();

        return ResponseEntity.ok(Map.of("total", total, "data", data));
    }

    @PatchMapping("/applications/{id}/status")
    @Transactional
    public ResponseEntity<?> updateApplicationStatus(
        @PathVariable String id,
        @RequestBody ApplicationStatusUpdateRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        CandidateApplication application = candidateApplicationRepository.findById(UUID.fromString(id)).orElse(null);
        if (application == null) {
            return ResponseEntity.notFound().build();
        }
        if (request.getStatus() != null) {
            try {
                application.setStatus(CandidateStatus.fromValue(request.getStatus()));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body("Invalid status");
            }
        }
        if (request.getRejectionReason() != null) {
            application.setRejectionReason(request.getRejectionReason());
            application.setRejectionNotes(request.getRejectionNotes());
        }
        if (request.getNotes() != null) {
            application.setNotes(request.getNotes());
        }
        candidateApplicationRepository.save(application);
        return ResponseEntity.ok(Map.of("message", "Status updated"));
    }

    private OffsetDateTime parseDate(String value, boolean end) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            OffsetDateTime parsed = OffsetDateTime.parse(value);
            if (end) {
                return parsed;
            }
            return parsed;
        } catch (Exception ex) {
            // Ignore and try date-only
        }
        try {
            LocalDate date = LocalDate.parse(value);
            if (end) {
                return date.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
            }
            return date.atStartOfDay().atOffset(ZoneOffset.UTC);
        } catch (Exception ex) {
            return null;
        }
    }
}
