package com.hirepath.recruitment.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.recruitment.client.ApprovalClient;
import com.hirepath.recruitment.client.dto.ApprovalFlowResponse;
import com.hirepath.recruitment.client.dto.ApprovalRequestCreateRequest;
import com.hirepath.recruitment.client.dto.ApprovalRequestCreateResponse;
import com.hirepath.recruitment.client.dto.ApprovalStatusResponse;
import com.hirepath.recruitment.client.dto.InternalApprovalActionRequest;
import com.hirepath.recruitment.domain.Candidate;
import com.hirepath.recruitment.domain.CandidateApplication;
import com.hirepath.recruitment.domain.Offer;
import com.hirepath.recruitment.domain.OfferStatus;
import com.hirepath.recruitment.domain.UserRole;
import com.hirepath.recruitment.dto.OfferActionRequest;
import com.hirepath.recruitment.dto.OfferCreateRequest;
import com.hirepath.recruitment.repository.CandidateApplicationRepository;
import com.hirepath.recruitment.repository.OfferRepository;
import com.hirepath.recruitment.util.UserContext;

import org.springframework.data.domain.Sort;
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

import feign.FeignException;

@RestController
@RequestMapping("/api/offers")
public class OfferController {

    private final OfferRepository offerRepository;
    private final CandidateApplicationRepository candidateApplicationRepository;
    private final ApprovalClient approvalClient;

    public OfferController(
        OfferRepository offerRepository,
        CandidateApplicationRepository candidateApplicationRepository,
        ApprovalClient approvalClient
    ) {
        this.offerRepository = offerRepository;
        this.candidateApplicationRepository = candidateApplicationRepository;
        this.approvalClient = approvalClient;
    }

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER);
        List<Offer> offers = offerRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Map<String, Object>> data = offers.stream().map(offer -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", offer.getId());
            row.put("application_id", offer.getApplication() != null ? offer.getApplication().getId() : null);
            CandidateApplication application = offer.getApplication();
            Candidate candidate = application != null ? application.getCandidate() : null;
            row.put("candidate_id", candidate != null ? candidate.getId() : null);
            row.put("candidate_name", candidate != null ? candidate.getFullName() : null);
            row.put("position_title", application != null && application.getPosition() != null ? application.getPosition().getTitle() : null);
            row.put("base_salary", offer.getBaseSalary());
            row.put("bonus", offer.getBonus());
            row.put("equity", offer.getEquity());
            row.put("benefits", offer.getBenefits());
            row.put("joining_date", offer.getJoiningDate());
            row.put("offer_expiry", offer.getOfferExpiry());
            row.put("terms", offer.getTerms());
            row.put("status", offer.getStatus() != null ? offer.getStatus().getValue() : null);
            row.put("candidate_response", offer.getCandidateResponse());
            row.put("candidate_notes", offer.getCandidateNotes());
            row.put("responded_at", offer.getRespondedAt());
            row.put("created_at", offer.getCreatedAt());
            row.put("approval_flow_id", offer.getApprovalFlowId());
            row.put("approval_request_id", offer.getApprovalRequestId());
            row.put("approval_status", fetchApprovalStatus("offer", offer.getId().toString()));
            row.put("approvals", List.of());
            return row;
        }).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER);
        Offer offer = offerRepository.findById(UUID.fromString(id)).orElse(null);
        if (offer == null) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", offer.getId());
        row.put("application_id", offer.getApplication() != null ? offer.getApplication().getId() : null);
        CandidateApplication application = offer.getApplication();
        Candidate candidate = application != null ? application.getCandidate() : null;
        row.put("candidate_id", candidate != null ? candidate.getId() : null);
        row.put("candidate_name", candidate != null ? candidate.getFullName() : null);
        row.put("position_title", application != null && application.getPosition() != null ? application.getPosition().getTitle() : null);
        row.put("base_salary", offer.getBaseSalary());
        row.put("bonus", offer.getBonus());
        row.put("equity", offer.getEquity());
        row.put("benefits", offer.getBenefits());
        row.put("joining_date", offer.getJoiningDate());
        row.put("offer_expiry", offer.getOfferExpiry());
        row.put("terms", offer.getTerms());
        row.put("status", offer.getStatus() != null ? offer.getStatus().getValue() : null);
        row.put("candidate_response", offer.getCandidateResponse());
        row.put("candidate_notes", offer.getCandidateNotes());
        row.put("responded_at", offer.getRespondedAt());
        row.put("created_at", offer.getCreatedAt());
        row.put("approval_flow_id", offer.getApprovalFlowId());
        row.put("approval_request_id", offer.getApprovalRequestId());
        row.put("approval_status", fetchApprovalStatus("offer", offer.getId().toString()));
        row.put("approvals", List.of());
        return ResponseEntity.ok(row);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> create(@RequestBody OfferCreateRequest request, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER);
        if (request.getApplicationId() == null || request.getApplicationId().isBlank()) {
            return ResponseEntity.badRequest().body("application_id is required");
        }
        CandidateApplication application = candidateApplicationRepository
            .findById(UUID.fromString(request.getApplicationId()))
            .orElse(null);
        if (application == null) {
            return ResponseEntity.badRequest().body("Invalid application_id");
        }

        Offer offer = new Offer();
        offer.setApplication(application);
        offer.setCreatedBy(UserContext.getUserId(user));
        offer.setApprovalFlowId(request.getApprovalFlowId());
        if (request.getBaseSalary() != null && !request.getBaseSalary().isBlank()) {
            offer.setBaseSalary(new BigDecimal(request.getBaseSalary()));
        }
        if (request.getBonus() != null && !request.getBonus().isBlank()) {
            offer.setBonus(new BigDecimal(request.getBonus()));
        }
        offer.setEquity(request.getEquity());
        offer.setBenefits(request.getBenefits());
        if (request.getJoiningDate() != null && !request.getJoiningDate().isBlank()) {
            offer.setJoiningDate(LocalDate.parse(request.getJoiningDate()));
        }
        if (request.getOfferExpiry() != null && !request.getOfferExpiry().isBlank()) {
            offer.setOfferExpiry(LocalDate.parse(request.getOfferExpiry()));
        }
        offer.setTerms(request.getTerms());
        offer.setStatus(OfferStatus.DRAFT);

        Offer saved = offerRepository.save(offer);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", saved.getId(), "message", "Offer created"));
    }

    @PostMapping("/{id}/send-for-approval")
    @Transactional
    public ResponseEntity<?> sendForApproval(@PathVariable String id, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER);
        Offer offer = offerRepository.findById(UUID.fromString(id)).orElse(null);
        if (offer == null) {
            return ResponseEntity.notFound().build();
        }
        if (offer.getApprovalFlowId() == null || offer.getApprovalFlowId().isBlank()) {
            return ResponseEntity.badRequest().body("approval_flow_id is required");
        }
        ApprovalFlowResponse flow = approvalClient.getFlow(offer.getApprovalFlowId());
        if (flow == null || !flow.isActive()) {
            return ResponseEntity.badRequest().body("Invalid approval flow");
        }
        if (flow.getStages() == null || flow.getStages().isEmpty()) {
            return ResponseEntity.badRequest().body("Approval flow has no stages");
        }
        try {
            ApprovalRequestCreateRequest approvalRequest = new ApprovalRequestCreateRequest();
            approvalRequest.setFlowId(offer.getApprovalFlowId());
            approvalRequest.setModule("recruitment");
            approvalRequest.setEntityType("offer");
            approvalRequest.setEntityId(offer.getId().toString());
            approvalRequest.setTitle("Offer Approval");
            approvalRequest.setSummary("Offer for " + (offer.getApplication() != null && offer.getApplication().getCandidate() != null
                ? offer.getApplication().getCandidate().getFullName() : "candidate"));
            approvalRequest.setRequesterId(UserContext.getUserId(user));
            approvalRequest.setRequesterName(user != null ? user.getFullName() : null);
            approvalRequest.setPriority("medium");
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("candidate_id", offer.getApplication() != null && offer.getApplication().getCandidate() != null
                ? offer.getApplication().getCandidate().getId() : null);
            payload.put("position_title", offer.getApplication() != null && offer.getApplication().getPosition() != null
                ? offer.getApplication().getPosition().getTitle() : null);
            payload.put("base_salary", offer.getBaseSalary());
            payload.put("bonus", offer.getBonus());
            approvalRequest.setPayloadSnapshot(payload);
            approvalRequest.setSubmit(true);
            ApprovalRequestCreateResponse created = approvalClient.createApprovalRequest(approvalRequest);
            if (created != null && created.getId() != null) {
                offer.setApprovalRequestId(created.getId());
            }
            offer.setStatus(OfferStatus.PENDING_APPROVAL);
            offerRepository.save(offer);
            return ResponseEntity.ok(Map.of("message", "Offer sent for approval"));
        } catch (FeignException ex) {
            return ResponseEntity.status(ex.status()).body("Approval service error");
        }
    }

    @PostMapping("/{id}/approve")
    @Transactional
    public ResponseEntity<?> approveOffer(
        @PathVariable String id,
        @RequestBody OfferActionRequest action,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER);
        Offer offer = offerRepository.findById(UUID.fromString(id)).orElse(null);
        if (offer == null) {
            return ResponseEntity.notFound().build();
        }
        if (offer.getApprovalRequestId() == null || offer.getApprovalRequestId().isBlank()) {
            return ResponseEntity.badRequest().body("approval_request_id is missing");
        }
        if (action == null || action.getStatus() == null) {
            return ResponseEntity.badRequest().body("status is required");
        }
        InternalApprovalActionRequest internalAction = new InternalApprovalActionRequest();
        internalAction.setAction(action.getStatus());
        internalAction.setComment(action.getComments());
        internalAction.setActorId(UserContext.getUserId(user));
        internalAction.setActorName(user != null ? user.getFullName() : null);
        internalAction.setActorEmail(user != null ? user.getUsername() : null);
        internalAction.setActorRoles(user != null ? user.getRoleNames() : List.of());
        try {
            approvalClient.actOnApproval(offer.getApprovalRequestId(), internalAction);
        } catch (FeignException ex) {
            return ResponseEntity.status(ex.status()).body("Approval service error");
        }
        return ResponseEntity.ok(Map.of("message", "Offer " + action.getStatus()));
    }

    @PostMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> updateStatus(
        @PathVariable String id,
        @RequestBody OfferActionRequest action,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER);
        Offer offer = offerRepository.findById(UUID.fromString(id)).orElse(null);
        if (offer == null) {
            return ResponseEntity.notFound().build();
        }
        if (action.getStatus() == null) {
            return ResponseEntity.badRequest().body("status is required");
        }
        try {
            offer.setStatus(OfferStatus.fromValue(action.getStatus()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body("Invalid status");
        }
        if ("accepted".equalsIgnoreCase(action.getStatus()) || "declined".equalsIgnoreCase(action.getStatus())) {
            offer.setCandidateResponse(action.getStatus());
            offer.setCandidateNotes(action.getComments());
            offer.setRespondedAt(OffsetDateTime.now());
        }
        offerRepository.save(offer);
        return ResponseEntity.ok(Map.of("message", "Offer status updated"));
    }

    private String fetchApprovalStatus(String entityType, String entityId) {
        try {
            ApprovalStatusResponse status = approvalClient.getApprovalStatus("recruitment", entityType, entityId);
            return status != null ? status.getStatus() : null;
        } catch (FeignException.NotFound ex) {
            return null;
        } catch (FeignException ex) {
            return null;
        }
    }

}
