package com.hirepath.recruitment.controller;

import java.util.Map;
import java.util.UUID;

import com.hirepath.recruitment.domain.HiringRequest;
import com.hirepath.recruitment.domain.JobPosition;
import com.hirepath.recruitment.domain.JobStatus;
import com.hirepath.recruitment.domain.Offer;
import com.hirepath.recruitment.domain.OfferStatus;
import com.hirepath.recruitment.domain.RequestStatus;
import com.hirepath.recruitment.domain.CandidateApplication;
import com.hirepath.recruitment.domain.CandidateStatus;
import com.hirepath.recruitment.domain.ApplicationDecision;
import com.hirepath.recruitment.domain.PipelineStage;
import com.hirepath.recruitment.dto.ApprovalStatusUpdateRequest;
import com.hirepath.recruitment.repository.ApplicationDecisionRepository;
import com.hirepath.recruitment.repository.CandidateApplicationRepository;
import com.hirepath.recruitment.repository.HiringRequestRepository;
import com.hirepath.recruitment.repository.JobPositionRepository;
import com.hirepath.recruitment.repository.OfferRepository;
import com.hirepath.recruitment.repository.PipelineStageRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/recruitment/approvals")
public class InternalApprovalSyncController {

    private final HiringRequestRepository hiringRequestRepository;
    private final JobPositionRepository jobPositionRepository;
    private final OfferRepository offerRepository;
    private final ApplicationDecisionRepository decisionRepository;
    private final CandidateApplicationRepository applicationRepository;
    private final PipelineStageRepository pipelineStageRepository;

    public InternalApprovalSyncController(
        HiringRequestRepository hiringRequestRepository,
        JobPositionRepository jobPositionRepository,
        OfferRepository offerRepository,
        ApplicationDecisionRepository decisionRepository,
        CandidateApplicationRepository applicationRepository,
        PipelineStageRepository pipelineStageRepository
    ) {
        this.hiringRequestRepository = hiringRequestRepository;
        this.jobPositionRepository = jobPositionRepository;
        this.offerRepository = offerRepository;
        this.decisionRepository = decisionRepository;
        this.applicationRepository = applicationRepository;
        this.pipelineStageRepository = pipelineStageRepository;
    }

    @PostMapping("/status")
    @Transactional
    public ResponseEntity<?> updateStatus(@RequestBody ApprovalStatusUpdateRequest request) {
        if (request == null || request.getEntityType() == null || request.getEntityId() == null) {
            return ResponseEntity.badRequest().body("entity_type and entity_id are required");
        }
        String entityType = request.getEntityType().trim().toLowerCase();
        if ("hiring_request".equals(entityType)) {
            return updateHiringRequest(request);
        }
        if ("offer".equals(entityType)) {
            return updateOffer(request);
        }
        if ("application_decision".equals(entityType)) {
            return updateDecision(request);
        }
        return ResponseEntity.badRequest().body("Unsupported entity_type");
    }

    private ResponseEntity<?> updateHiringRequest(ApprovalStatusUpdateRequest request) {
        HiringRequest hiringRequest = hiringRequestRepository.findById(UUID.fromString(request.getEntityId())).orElse(null);
        if (hiringRequest == null) {
            return ResponseEntity.notFound().build();
        }
        if (request.getApprovalRequestId() != null && !request.getApprovalRequestId().isBlank()) {
            hiringRequest.setApprovalRequestId(request.getApprovalRequestId());
        }
        String status = request.getStatus() != null ? request.getStatus().trim().toLowerCase() : null;
        if ("approved".equals(status)) {
            hiringRequest.setStatus(RequestStatus.APPROVED);
            if (hiringRequest.getJobPosition() == null) {
                JobPosition position = new JobPosition();
                position.setHiringRequest(hiringRequest);
                position.setTitle(hiringRequest.getJobTitle());
                position.setDepartmentId(hiringRequest.getDepartmentId());
                position.setStatus(JobStatus.OPEN);
                JobPosition saved = jobPositionRepository.save(position);
                hiringRequest.setJobPosition(saved);
            }
        } else if ("rejected".equals(status) || "cancelled".equals(status)) {
            hiringRequest.setStatus(RequestStatus.REJECTED);
        }
        hiringRequestRepository.save(hiringRequest);
        return ResponseEntity.ok(Map.of("message", "Hiring request updated"));
    }

    private ResponseEntity<?> updateOffer(ApprovalStatusUpdateRequest request) {
        Offer offer = offerRepository.findById(UUID.fromString(request.getEntityId())).orElse(null);
        if (offer == null) {
            return ResponseEntity.notFound().build();
        }
        if (request.getApprovalRequestId() != null && !request.getApprovalRequestId().isBlank()) {
            offer.setApprovalRequestId(request.getApprovalRequestId());
        }
        String status = request.getStatus() != null ? request.getStatus().trim().toLowerCase() : null;
        if ("approved".equals(status)) {
            offer.setStatus(OfferStatus.APPROVED);
        } else if ("rejected".equals(status) || "cancelled".equals(status)) {
            offer.setStatus(OfferStatus.DECLINED);
        }
        offerRepository.save(offer);
        return ResponseEntity.ok(Map.of("message", "Offer updated"));
    }

    private ResponseEntity<?> updateDecision(ApprovalStatusUpdateRequest request) {
        CandidateApplication application = applicationRepository.findById(UUID.fromString(request.getEntityId())).orElse(null);
        if (application == null) {
            return ResponseEntity.notFound().build();
        }
        ApplicationDecision decision = decisionRepository.findByApplicationId(application.getId()).orElse(null);
        String status = request.getStatus() != null ? request.getStatus().trim().toLowerCase() : null;
        if (decision != null && request.getApprovalRequestId() != null && !request.getApprovalRequestId().isBlank()) {
            decision.setApprovalRequestId(request.getApprovalRequestId());
            decisionRepository.save(decision);
        }
        if ("approved".equals(status)) {
            application.setStatus(CandidateStatus.SELECTED);
            application.setDecisionStatus("selected");
            moveToCategoryStage(application, "hired");
        } else if ("rejected".equals(status) || "cancelled".equals(status)) {
            application.setStatus(CandidateStatus.REJECTED);
            application.setDecisionStatus("rejected");
            moveToCategoryStage(application, "rejected");
        }
        applicationRepository.save(application);
        return ResponseEntity.ok(Map.of("message", "Decision updated"));
    }

    private void moveToCategoryStage(CandidateApplication application, String category) {
        if (application.getPosition() == null) {
            return;
        }
        PipelineStage stage = pipelineStageRepository.findTopByVacancyIdAndCategoryIgnoreCase(application.getPosition().getId(), category)
            .orElse(null);
        if (stage != null) {
            application.setPipelineStage(stage);
        }
    }
}
