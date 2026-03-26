package com.hirepath.recruitment.controller;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.recruitment.domain.CandidateApplication;
import com.hirepath.recruitment.domain.CandidateStatus;
import com.hirepath.recruitment.domain.PipelineHistory;
import com.hirepath.recruitment.domain.PipelineStage;
import com.hirepath.recruitment.domain.UserRole;
import com.hirepath.recruitment.dto.PipelineMoveRequest;
import com.hirepath.recruitment.repository.CandidateApplicationRepository;
import com.hirepath.recruitment.repository.EvaluationScoreRepository;
import com.hirepath.recruitment.repository.InterviewRoundConfigRepository;
import com.hirepath.recruitment.repository.PipelineHistoryRepository;
import com.hirepath.recruitment.repository.PipelineStageRepository;
import com.hirepath.recruitment.service.RecruitmentEventService;
import com.hirepath.recruitment.util.UserContext;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.hirepath.recruitment.security.service.AppUserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recruitment/pipeline")
public class PipelineController {

    private final CandidateApplicationRepository applicationRepository;
    private final PipelineStageRepository stageRepository;
    private final PipelineHistoryRepository historyRepository;
    private final InterviewRoundConfigRepository interviewRoundConfigRepository;
    private final EvaluationScoreRepository evaluationScoreRepository;
    private final RecruitmentEventService eventService;

    public PipelineController(
        CandidateApplicationRepository applicationRepository,
        PipelineStageRepository stageRepository,
        PipelineHistoryRepository historyRepository,
        InterviewRoundConfigRepository interviewRoundConfigRepository,
        EvaluationScoreRepository evaluationScoreRepository,
        RecruitmentEventService eventService
    ) {
        this.applicationRepository = applicationRepository;
        this.stageRepository = stageRepository;
        this.historyRepository = historyRepository;
        this.interviewRoundConfigRepository = interviewRoundConfigRepository;
        this.evaluationScoreRepository = evaluationScoreRepository;
        this.eventService = eventService;
    }

    @GetMapping("/{vacancyId}")
    public ResponseEntity<?> getPipeline(@PathVariable String vacancyId, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        UUID vacId = UUID.fromString(vacancyId);
        List<PipelineStage> stages = stageRepository.findByVacancyIdOrderByOrderIndexAsc(vacId);
        if (stages.isEmpty()) {
            stages = List.of();
        }
        List<CandidateApplication> applications = applicationRepository.findByPosition_Id(vacId);
        Map<String, List<Map<String, Object>>> cards = new LinkedHashMap<>();
        stages.forEach(stage -> cards.put(stage.getId().toString(), new java.util.ArrayList<>()));
        for (CandidateApplication app : applications) {
            PipelineStage stage = app.getPipelineStage();
            if (stage == null && !stages.isEmpty()) {
                stage = stages.get(0);
            }
            if (stage == null) {
                continue;
            }
            Map<String, Object> card = new LinkedHashMap<>();
            card.put("application_id", app.getId());
            card.put("candidate_id", app.getCandidate() != null ? app.getCandidate().getId() : null);
            card.put("candidate_name", app.getCandidate() != null ? app.getCandidate().getFullName() : null);
            card.put("current_title", app.getCandidate() != null ? app.getCandidate().getCurrentTitle() : null);
            card.put("skills", app.getCandidate() != null ? app.getCandidate().getSkills() : List.of());
            card.put("applied_at", app.getAppliedAt());
            card.put("status", app.getStatus() != null ? app.getStatus().getValue() : null);
            cards.computeIfAbsent(stage.getId().toString(), k -> new java.util.ArrayList<>()).add(card);
        }
        List<Map<String, Object>> stageRows = stages.stream().sorted(Comparator.comparing(PipelineStage::getOrderIndex))
            .map(stage -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", stage.getId());
                row.put("name", stage.getName());
                row.put("order_index", stage.getOrderIndex());
                row.put("is_terminal", stage.isTerminal());
                row.put("is_active", stage.isActive());
                row.put("category", stage.getCategory());
                return row;
            }).toList();
        return ResponseEntity.ok(Map.of("stages", stageRows, "cards", cards));
    }

    @PostMapping("/move")
    @Transactional
    public ResponseEntity<?> move(@RequestBody PipelineMoveRequest request, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        if (request == null || request.getApplicationId() == null || request.getToStageId() == null) {
            return ResponseEntity.badRequest().body("application_id and to_stage_id are required");
        }
        CandidateApplication application = applicationRepository.findById(UUID.fromString(request.getApplicationId())).orElse(null);
        if (application == null) {
            return ResponseEntity.notFound().build();
        }
        PipelineStage targetStage = stageRepository.findById(UUID.fromString(request.getToStageId())).orElse(null);
        if (targetStage == null) {
            return ResponseEntity.badRequest().body("Invalid stage");
        }
        if (application.getPosition() == null || !application.getPosition().getId().equals(targetStage.getVacancyId())) {
            return ResponseEntity.badRequest().body("Stage does not match vacancy");
        }
        try {
            enforceStrictGates(application, targetStage);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
        PipelineStage fromStage = application.getPipelineStage();
        application.setPipelineStage(targetStage);
        application.setStatus(mapStatus(targetStage.getCategory(), application.getStatus()));
        applicationRepository.save(application);

        PipelineHistory history = new PipelineHistory();
        history.setApplicationId(application.getId());
        history.setFromStageId(fromStage != null ? fromStage.getId() : null);
        history.setToStageId(targetStage.getId());
        history.setMovedBy(UserContext.getUserId(user));
        history.setMovedAt(OffsetDateTime.now());
        history.setReason(request.getReason());
        historyRepository.save(history);

        eventService.audit("pipeline", application.getId().toString(), "moved", UserContext.getUserId(user),
            Map.of("from_stage_id", fromStage != null ? fromStage.getId() : null, "to_stage_id", targetStage.getId()));

        return ResponseEntity.ok(Map.of("message", "Moved"));
    }

    @GetMapping("/history/{applicationId}")
    public ResponseEntity<?> history(@PathVariable String applicationId, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        List<PipelineHistory> history = historyRepository.findByApplicationIdOrderByMovedAtDesc(UUID.fromString(applicationId));
        List<Map<String, Object>> data = history.stream().map(h -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", h.getId());
            row.put("from_stage_id", h.getFromStageId());
            row.put("to_stage_id", h.getToStageId());
            row.put("moved_by", h.getMovedBy());
            row.put("moved_at", h.getMovedAt());
            row.put("reason", h.getReason());
            return row;
        }).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    private void enforceStrictGates(CandidateApplication application, PipelineStage targetStage) {
        String category = targetStage.getCategory() != null ? targetStage.getCategory().toLowerCase() : "";
        UUID vacancyId = application.getPosition() != null ? application.getPosition().getId() : null;
        if ("interview".equals(category)) {
            if (vacancyId == null || interviewRoundConfigRepository.countByVacancyIdAndRequiredTrue(vacancyId) == 0) {
                throw new IllegalArgumentException("Interview rounds are not configured");
            }
        }
        if ("decision".equals(category)) {
            if (vacancyId == null) {
                throw new IllegalArgumentException("Vacancy not found");
            }
            long required = interviewRoundConfigRepository.countByVacancyIdAndRequiredTrue(vacancyId);
            long submitted = evaluationScoreRepository.countByApplicationId(application.getId());
            if (required > 0 && submitted < required) {
                throw new IllegalArgumentException("Required feedback not completed");
            }
        }
    }

    private CandidateStatus mapStatus(String category, CandidateStatus current) {
        if (category == null) {
            return current;
        }
        switch (category.toLowerCase()) {
            case "shortlist":
                return CandidateStatus.SHORTLISTED;
            case "interview":
                return CandidateStatus.INTERVIEW_SCHEDULED;
            case "decision":
                return CandidateStatus.INTERVIEW_COMPLETED;
            case "hired":
                return CandidateStatus.HIRED;
            case "rejected":
                return CandidateStatus.REJECTED;
            default:
                return current;
        }
    }
}
