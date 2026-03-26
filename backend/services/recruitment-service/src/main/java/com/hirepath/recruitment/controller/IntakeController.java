package com.hirepath.recruitment.controller;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.recruitment.domain.Candidate;
import com.hirepath.recruitment.domain.CandidateApplication;
import com.hirepath.recruitment.domain.CandidateIntake;
import com.hirepath.recruitment.domain.CandidateStatus;
import com.hirepath.recruitment.domain.IntakeStatus;
import com.hirepath.recruitment.domain.JobPosition;
import com.hirepath.recruitment.domain.PipelineHistory;
import com.hirepath.recruitment.domain.PipelineStage;
import com.hirepath.recruitment.domain.UserRole;
import com.hirepath.recruitment.dto.IntakeUpdateRequest;
import com.hirepath.recruitment.repository.CandidateApplicationRepository;
import com.hirepath.recruitment.repository.CandidateIntakeRepository;
import com.hirepath.recruitment.repository.CandidateRepository;
import com.hirepath.recruitment.repository.JobPositionRepository;
import com.hirepath.recruitment.repository.PipelineHistoryRepository;
import com.hirepath.recruitment.repository.PipelineStageRepository;
import com.hirepath.recruitment.service.RecruitmentEventService;
import com.hirepath.recruitment.util.UserContext;

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
@RequestMapping("/api/recruitment/intake")
public class IntakeController {

    private final CandidateIntakeRepository intakeRepository;
    private final CandidateRepository candidateRepository;
    private final CandidateApplicationRepository applicationRepository;
    private final JobPositionRepository jobPositionRepository;
    private final PipelineStageRepository pipelineStageRepository;
    private final PipelineHistoryRepository pipelineHistoryRepository;
    private final RecruitmentEventService eventService;

    public IntakeController(
        CandidateIntakeRepository intakeRepository,
        CandidateRepository candidateRepository,
        CandidateApplicationRepository applicationRepository,
        JobPositionRepository jobPositionRepository,
        PipelineStageRepository pipelineStageRepository,
        PipelineHistoryRepository pipelineHistoryRepository,
        RecruitmentEventService eventService
    ) {
        this.intakeRepository = intakeRepository;
        this.candidateRepository = candidateRepository;
        this.applicationRepository = applicationRepository;
        this.jobPositionRepository = jobPositionRepository;
        this.pipelineStageRepository = pipelineStageRepository;
        this.pipelineHistoryRepository = pipelineHistoryRepository;
        this.eventService = eventService;
    }

    @GetMapping
    public ResponseEntity<?> list(
        @RequestParam(value = "vacancy_id", required = false) String vacancyId,
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "reviewer_id", required = false) String reviewerId,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        List<CandidateIntake> intakes = vacancyId != null && !vacancyId.isBlank()
            ? intakeRepository.findByVacancyId(UUID.fromString(vacancyId))
            : intakeRepository.findAll();

        if (status != null && !status.isBlank()) {
            IntakeStatus statusFilter = IntakeStatus.fromValue(status);
            intakes = intakes.stream().filter(i -> i.getStatus() == statusFilter).toList();
        }
        if (reviewerId != null && !reviewerId.isBlank()) {
            intakes = intakes.stream().filter(i -> reviewerId.equals(i.getReviewerId())).toList();
        }

        List<Map<String, Object>> data = intakes.stream()
            .sorted(Comparator.comparing(CandidateIntake::getCreatedAt).reversed())
            .map(intake -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", intake.getId());
                row.put("vacancy_id", intake.getVacancyId());
                row.put("form_submission_id", intake.getFormSubmissionId());
                row.put("form_id", intake.getFormId());
                row.put("candidate_name", intake.getCandidateName());
                row.put("email", intake.getEmail());
                row.put("phone", intake.getPhone());
                row.put("resume_url", intake.getResumeUrl());
                row.put("source", intake.getSource());
                row.put("status", intake.getStatus() != null ? intake.getStatus().getValue() : null);
                row.put("reviewer_id", intake.getReviewerId());
                row.put("reviewed_at", intake.getReviewedAt());
                row.put("created_at", intake.getCreatedAt());
                row.put("duplicate_of_intake_id", intake.getDuplicateOfIntakeId());
                return row;
            }).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    @PatchMapping("/{id}")
    @Transactional
    public ResponseEntity<?> update(
        @PathVariable String id,
        @RequestBody IntakeUpdateRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        CandidateIntake intake = intakeRepository.findById(UUID.fromString(id)).orElse(null);
        if (intake == null) {
            return ResponseEntity.notFound().build();
        }
        if (request.getReviewerId() != null) {
            intake.setReviewerId(request.getReviewerId());
        }
        if (request.getStatus() != null) {
            IntakeStatus status = IntakeStatus.fromValue(request.getStatus());
            intake.setStatus(status);
            intake.setReviewedAt(OffsetDateTime.now());
        }
        intakeRepository.save(intake);
        eventService.audit("intake", intake.getId().toString(), "updated", UserContext.getUserId(user),
            Map.of("status", intake.getStatus() != null ? intake.getStatus().getValue() : null));
        return ResponseEntity.ok(Map.of("message", "Intake updated"));
    }

    @PostMapping("/{id}/shortlist")
    @Transactional
    public ResponseEntity<?> shortlist(
        @PathVariable String id,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        CandidateIntake intake = intakeRepository.findById(UUID.fromString(id)).orElse(null);
        if (intake == null) {
            return ResponseEntity.notFound().build();
        }
        if (intake.getDuplicateOfIntakeId() != null) {
            return ResponseEntity.badRequest().body("Duplicate intake cannot be shortlisted");
        }
        JobPosition vacancy = jobPositionRepository.findById(intake.getVacancyId()).orElse(null);
        if (vacancy == null) {
            return ResponseEntity.badRequest().body("Invalid vacancy_id");
        }
        String email = intake.getEmail();
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body("Email is required");
        }

        String dedupeKey = vacancy.getId() + ":" + email.trim().toLowerCase();
        if (applicationRepository.findTopByDedupeKey(dedupeKey).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Application already exists");
        }

        Candidate candidate = candidateRepository.findByEmail(email).orElse(null);
        if (candidate == null) {
            candidate = new Candidate();
            candidate.setFullName(intake.getCandidateName());
            candidate.setEmail(email);
            candidate.setPhone(intake.getPhone());
            candidate.setResumeUrl(intake.getResumeUrl());
            candidate.setSource(intake.getSource());
            candidateRepository.save(candidate);
        }

        PipelineStage firstStage = ensureDefaultStages(vacancy.getId()).stream()
            .findFirst().orElse(null);
        CandidateApplication application = new CandidateApplication();
        application.setCandidate(candidate);
        application.setPosition(vacancy);
        application.setIntake(intake);
        application.setStatus(CandidateStatus.SHORTLISTED);
        application.setPipelineStage(firstStage);
        application.setConsentGiven(true);
        application.setDedupeKey(dedupeKey);
        CandidateApplication saved = applicationRepository.save(application);

        if (firstStage != null) {
            PipelineHistory history = new PipelineHistory();
            history.setApplicationId(saved.getId());
            history.setFromStageId(null);
            history.setToStageId(firstStage.getId());
            history.setMovedBy(UserContext.getUserId(user));
            history.setMovedAt(OffsetDateTime.now());
            history.setReason("Shortlisted from intake");
            pipelineHistoryRepository.save(history);
        }

        intake.setStatus(IntakeStatus.SHORTLISTED);
        intake.setReviewerId(UserContext.getUserId(user));
        intake.setReviewedAt(OffsetDateTime.now());
        intakeRepository.save(intake);

        eventService.audit("intake", intake.getId().toString(), "shortlisted", UserContext.getUserId(user),
            Map.of("application_id", saved.getId()));

        return ResponseEntity.ok(Map.of("application_id", saved.getId()));
    }

    private List<PipelineStage> ensureDefaultStages(UUID vacancyId) {
        List<PipelineStage> stages = pipelineStageRepository.findByVacancyIdOrderByOrderIndexAsc(vacancyId);
        if (!stages.isEmpty()) {
            return stages;
        }
        PipelineStage shortlisted = buildStage(vacancyId, "Shortlisted", 1, false, "shortlist");
        PipelineStage interview = buildStage(vacancyId, "Interview", 2, false, "interview");
        PipelineStage decision = buildStage(vacancyId, "Decision", 3, false, "decision");
        PipelineStage hired = buildStage(vacancyId, "Hired", 4, true, "hired");
        PipelineStage rejected = buildStage(vacancyId, "Rejected", 5, true, "rejected");
        pipelineStageRepository.saveAll(List.of(shortlisted, interview, decision, hired, rejected));
        return pipelineStageRepository.findByVacancyIdOrderByOrderIndexAsc(vacancyId);
    }

    private PipelineStage buildStage(UUID vacancyId, String name, int order, boolean terminal, String category) {
        PipelineStage stage = new PipelineStage();
        stage.setVacancyId(vacancyId);
        stage.setName(name);
        stage.setOrderIndex(order);
        stage.setTerminal(terminal);
        stage.setActive(true);
        stage.setCategory(category);
        return stage;
    }
}
