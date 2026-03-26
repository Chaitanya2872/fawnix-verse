package com.hirepath.recruitment.controller;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.recruitment.domain.InterviewRoundConfigEntity;
import com.hirepath.recruitment.domain.JobPosition;
import com.hirepath.recruitment.domain.PipelineStage;
import com.hirepath.recruitment.domain.UserRole;
import com.hirepath.recruitment.dto.InterviewRoundConfigRequest;
import com.hirepath.recruitment.dto.PipelineConfigRequest;
import com.hirepath.recruitment.repository.InterviewRoundConfigRepository;
import com.hirepath.recruitment.repository.JobPositionRepository;
import com.hirepath.recruitment.repository.PipelineStageRepository;
import com.hirepath.recruitment.util.UserContext;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.hirepath.recruitment.security.service.AppUserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recruitment/vacancies")
public class VacancyConfigController {

    private final JobPositionRepository jobPositionRepository;
    private final PipelineStageRepository pipelineStageRepository;
    private final InterviewRoundConfigRepository interviewRoundConfigRepository;

    public VacancyConfigController(
        JobPositionRepository jobPositionRepository,
        PipelineStageRepository pipelineStageRepository,
        InterviewRoundConfigRepository interviewRoundConfigRepository
    ) {
        this.jobPositionRepository = jobPositionRepository;
        this.pipelineStageRepository = pipelineStageRepository;
        this.interviewRoundConfigRepository = interviewRoundConfigRepository;
    }

    @GetMapping("/{id}/pipeline-config")
    public ResponseEntity<?> getPipelineConfig(@PathVariable String id, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        UUID vacancyId = UUID.fromString(id);
        List<PipelineStage> stages = pipelineStageRepository.findByVacancyIdOrderByOrderIndexAsc(vacancyId);
        List<Map<String, Object>> data = stages.stream()
            .sorted(Comparator.comparing(PipelineStage::getOrderIndex))
            .map(stage -> {
                Map<String, Object> row = new java.util.LinkedHashMap<>();
                row.put("id", stage.getId());
                row.put("name", stage.getName());
                row.put("order_index", stage.getOrderIndex());
                row.put("is_terminal", stage.isTerminal());
                row.put("is_active", stage.isActive());
                row.put("category", stage.getCategory());
                return row;
            }).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    @PatchMapping("/{id}/pipeline-config")
    @Transactional
    public ResponseEntity<?> updatePipelineConfig(
        @PathVariable String id,
        @RequestBody PipelineConfigRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER);
        JobPosition vacancy = jobPositionRepository.findById(UUID.fromString(id)).orElse(null);
        if (vacancy == null) {
            return ResponseEntity.notFound().build();
        }
        List<PipelineStage> existing = pipelineStageRepository.findByVacancyIdOrderByOrderIndexAsc(vacancy.getId());
        pipelineStageRepository.deleteAll(existing);

        if (request != null && request.getStages() != null) {
            for (PipelineConfigRequest.StageRequest stageReq : request.getStages()) {
                PipelineStage stage = new PipelineStage();
                stage.setVacancyId(vacancy.getId());
                stage.setName(stageReq.getName());
                stage.setOrderIndex(stageReq.getOrderIndex());
                stage.setTerminal(Boolean.TRUE.equals(stageReq.getTerminal()));
                stage.setActive(stageReq.getActive() == null || stageReq.getActive());
                stage.setCategory(stageReq.getCategory());
                pipelineStageRepository.save(stage);
            }
        }
        vacancy.setPipelineConfigStatus("configured");
        jobPositionRepository.save(vacancy);
        return ResponseEntity.ok(Map.of("message", "Pipeline config updated"));
    }

    @GetMapping("/{id}/interview-rounds")
    public ResponseEntity<?> getInterviewRounds(@PathVariable String id, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        UUID vacancyId = UUID.fromString(id);
        List<InterviewRoundConfigEntity> rounds = interviewRoundConfigRepository.findByVacancyIdOrderByRoundNumberAsc(vacancyId);
        List<Map<String, Object>> data = rounds.stream().map(round -> {
            Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("id", round.getId());
            row.put("round_number", round.getRoundNumber());
            row.put("name", round.getName());
            row.put("type", round.getType());
            row.put("duration_minutes", round.getDurationMinutes());
            row.put("panel_roles", round.getPanelRoles());
            row.put("scorecard_id", round.getScorecardId());
            row.put("is_required", round.isRequired());
            return row;
        }).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    @PatchMapping("/{id}/interview-rounds")
    @Transactional
    public ResponseEntity<?> updateInterviewRounds(
        @PathVariable String id,
        @RequestBody InterviewRoundConfigRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER);
        JobPosition vacancy = jobPositionRepository.findById(UUID.fromString(id)).orElse(null);
        if (vacancy == null) {
            return ResponseEntity.notFound().build();
        }
        List<InterviewRoundConfigEntity> existing = interviewRoundConfigRepository.findByVacancyIdOrderByRoundNumberAsc(vacancy.getId());
        interviewRoundConfigRepository.deleteAll(existing);
        if (request != null && request.getRounds() != null) {
            for (InterviewRoundConfigRequest.RoundRequest round : request.getRounds()) {
                InterviewRoundConfigEntity entity = new InterviewRoundConfigEntity();
                entity.setVacancyId(vacancy.getId());
                entity.setRoundNumber(round.getRoundNumber());
                entity.setName(round.getName());
                entity.setType(round.getType());
                entity.setDurationMinutes(round.getDurationMinutes());
                entity.setPanelRoles(round.getPanelRoles());
                entity.setScorecardId(round.getScorecardId());
                entity.setRequired(round.getRequired() == null || round.getRequired());
                interviewRoundConfigRepository.save(entity);
            }
        }
        return ResponseEntity.ok(Map.of("message", "Interview rounds updated"));
    }
}
