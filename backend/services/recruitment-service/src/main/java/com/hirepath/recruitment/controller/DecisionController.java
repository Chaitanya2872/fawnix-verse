package com.hirepath.recruitment.controller;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.hirepath.recruitment.client.ApprovalClient;
import com.hirepath.recruitment.client.dto.ApprovalRequestCreateRequest;
import com.hirepath.recruitment.client.dto.ApprovalRequestCreateResponse;
import com.hirepath.recruitment.domain.ApplicationDecision;
import com.hirepath.recruitment.domain.CandidateApplication;
import com.hirepath.recruitment.domain.UserRole;
import com.hirepath.recruitment.dto.DecisionCreateRequest;
import com.hirepath.recruitment.repository.ApplicationDecisionRepository;
import com.hirepath.recruitment.repository.CandidateApplicationRepository;
import com.hirepath.recruitment.repository.EvaluationScoreRepository;
import com.hirepath.recruitment.repository.InterviewRoundConfigRepository;
import com.hirepath.recruitment.service.RecruitmentEventService;
import com.hirepath.recruitment.util.UserContext;

import feign.FeignException;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/recruitment/decisions")
public class DecisionController {

    private final ApplicationDecisionRepository decisionRepository;
    private final CandidateApplicationRepository applicationRepository;
    private final InterviewRoundConfigRepository interviewRoundConfigRepository;
    private final EvaluationScoreRepository evaluationScoreRepository;
    private final ApprovalClient approvalClient;
    private final RecruitmentEventService eventService;

    public DecisionController(
        ApplicationDecisionRepository decisionRepository,
        CandidateApplicationRepository applicationRepository,
        InterviewRoundConfigRepository interviewRoundConfigRepository,
        EvaluationScoreRepository evaluationScoreRepository,
        ApprovalClient approvalClient,
        RecruitmentEventService eventService
    ) {
        this.decisionRepository = decisionRepository;
        this.applicationRepository = applicationRepository;
        this.interviewRoundConfigRepository = interviewRoundConfigRepository;
        this.evaluationScoreRepository = evaluationScoreRepository;
        this.approvalClient = approvalClient;
        this.eventService = eventService;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> create(
        @RequestBody DecisionCreateRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.HIRING_MANAGER);
        if (request == null || request.getApplicationId() == null) {
            return ResponseEntity.badRequest().body("application_id is required");
        }
        CandidateApplication application = applicationRepository.findById(UUID.fromString(request.getApplicationId())).orElse(null);
        if (application == null) {
            return ResponseEntity.badRequest().body("Invalid application_id");
        }
        if (application.getPosition() == null) {
            return ResponseEntity.badRequest().body("Vacancy is missing");
        }
        long required = interviewRoundConfigRepository.countByVacancyIdAndRequiredTrue(application.getPosition().getId());
        long submitted = evaluationScoreRepository.countByApplicationId(application.getId());
        if (required > 0 && submitted < required) {
            return ResponseEntity.badRequest().body("Required feedback not completed");
        }

        ApplicationDecision decision = decisionRepository.findByApplicationId(application.getId()).orElse(null);
        if (decision == null) {
            decision = new ApplicationDecision();
            decision.setApplicationId(application.getId());
        }
        decision.setDecisionStatus(request.getDecisionStatus());
        decision.setDecisionReason(request.getDecisionReason());
        decision.setDecisionNotes(request.getDecisionNotes());
        decision.setDecisionScore(request.getDecisionScore());
        decision.setDecisionBy(UserContext.getUserId(user));
        decision.setDecisionAt(OffsetDateTime.now());
        decisionRepository.save(decision);

        try {
            ApprovalRequestCreateRequest approvalRequest = new ApprovalRequestCreateRequest();
            approvalRequest.setFlowId(application.getPosition().getApprovalFlowId());
            approvalRequest.setModule("recruitment");
            approvalRequest.setEntityType("application_decision");
            approvalRequest.setEntityId(application.getId().toString());
            approvalRequest.setTitle("Hiring Decision");
            approvalRequest.setSummary("Decision for " + (application.getCandidate() != null ? application.getCandidate().getFullName() : "candidate"));
            approvalRequest.setRequesterId(UserContext.getUserId(user));
            approvalRequest.setRequesterName(user != null ? user.getFullName() : null);
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("decision_status", decision.getDecisionStatus());
            payload.put("decision_score", decision.getDecisionScore());
            payload.put("candidate_id", application.getCandidate() != null ? application.getCandidate().getId() : null);
            payload.put("position_id", application.getPosition().getId());
            approvalRequest.setPayloadSnapshot(payload);
            approvalRequest.setSubmit(true);
            ApprovalRequestCreateResponse created = approvalClient.createApprovalRequest(approvalRequest);
            if (created != null && created.getId() != null) {
                decision.setApprovalRequestId(created.getId());
                decisionRepository.save(decision);
            }
        } catch (FeignException ex) {
            return ResponseEntity.status(ex.status()).body("Approval service error");
        }

        application.setDecisionStatus(decision.getDecisionStatus());
        application.setDecisionNotes(decision.getDecisionNotes());
        application.setDecisionAt(decision.getDecisionAt());
        applicationRepository.save(application);

        eventService.audit("decision", application.getId().toString(), "submitted", UserContext.getUserId(user),
            Map.of("decision_status", decision.getDecisionStatus()));

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", decision.getId()));
    }

    @GetMapping("/{applicationId}")
    public ResponseEntity<?> get(@PathVariable String applicationId, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.HIRING_MANAGER);
        ApplicationDecision decision = decisionRepository.findByApplicationId(UUID.fromString(applicationId)).orElse(null);
        if (decision == null) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", decision.getId());
        row.put("application_id", decision.getApplicationId());
        row.put("decision_status", decision.getDecisionStatus());
        row.put("decision_reason", decision.getDecisionReason());
        row.put("decision_notes", decision.getDecisionNotes());
        row.put("decision_score", decision.getDecisionScore());
        row.put("decision_by", decision.getDecisionBy());
        row.put("decision_at", decision.getDecisionAt());
        row.put("approval_request_id", decision.getApprovalRequestId());
        return ResponseEntity.ok(row);
    }
}
