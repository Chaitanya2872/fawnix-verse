package com.hirepath.recruitment.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.recruitment.client.ApprovalClient;
import com.hirepath.recruitment.client.dto.ApprovalFlowResponse;
import com.hirepath.recruitment.domain.Candidate;
import com.hirepath.recruitment.domain.CandidateApplication;
import com.hirepath.recruitment.domain.Offer;
import com.hirepath.recruitment.domain.OfferApproval;
import com.hirepath.recruitment.domain.OfferStatus;
import com.hirepath.recruitment.domain.RequestStatus;
import com.hirepath.recruitment.domain.UserRole;
import com.hirepath.recruitment.dto.OfferActionRequest;
import com.hirepath.recruitment.dto.OfferCreateRequest;
import com.hirepath.recruitment.repository.CandidateApplicationRepository;
import com.hirepath.recruitment.repository.OfferApprovalRepository;
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

@RestController
@RequestMapping("/api/offers")
public class OfferController {

    private final OfferRepository offerRepository;
    private final OfferApprovalRepository offerApprovalRepository;
    private final CandidateApplicationRepository candidateApplicationRepository;
    private final ApprovalClient approvalClient;

    public OfferController(
        OfferRepository offerRepository,
        OfferApprovalRepository offerApprovalRepository,
        CandidateApplicationRepository candidateApplicationRepository,
        ApprovalClient approvalClient
    ) {
        this.offerRepository = offerRepository;
        this.offerApprovalRepository = offerApprovalRepository;
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
            row.put("approvals", offer.getApprovals() != null
                ? offer.getApprovals().stream()
                    .sorted(Comparator.comparing(a -> a.getLevel() == null ? 0 : a.getLevel()))
                    .map(this::approvalSummary)
                    .toList()
                : List.of());
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
        row.put("approvals", offer.getApprovals() != null
            ? offer.getApprovals().stream()
                .sorted(Comparator.comparing(a -> a.getLevel() == null ? 0 : a.getLevel()))
                .map(this::approvalDetail)
                .toList()
            : List.of());
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

        List<ApprovalFlowResponse.ApprovalStageResponse> stages = flow.getStages().stream()
            .sorted(Comparator.comparing(stage -> stage.getOrder() == null ? 0 : stage.getOrder()))
            .toList();
        for (ApprovalFlowResponse.ApprovalStageResponse stage : stages) {
            OfferApproval approval = new OfferApproval();
            approval.setOffer(offer);
            approval.setApproverId(stage.getApproverUserId());
            approval.setLevel(stage.getOrder());
            approval.setStatus(RequestStatus.PENDING);
            approval.setComments(null);
            offerApprovalRepository.save(approval);
        }
        offer.setStatus(OfferStatus.PENDING_APPROVAL);
        offerRepository.save(offer);
        return ResponseEntity.ok(Map.of("message", "Offer sent for approval"));
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
        OfferApproval current = currentPendingApproval(offer);
        if (current == null) {
            return ResponseEntity.badRequest().body("No pending approvals");
        }
        if (!"approved".equalsIgnoreCase(action.getStatus()) && !"rejected".equalsIgnoreCase(action.getStatus())) {
            return ResponseEntity.badRequest().body("Invalid status");
        }
        current.setStatus("approved".equalsIgnoreCase(action.getStatus()) ? RequestStatus.APPROVED : RequestStatus.REJECTED);
        current.setComments(action.getComments());
        current.setDecidedAt(OffsetDateTime.now());
        offerApprovalRepository.save(current);

        OfferApproval next = currentPendingApproval(offer);
        if (next == null) {
            offer.setStatus(RequestStatus.REJECTED.equals(current.getStatus()) ? OfferStatus.DECLINED : OfferStatus.APPROVED);
        } else {
            offer.setStatus(OfferStatus.PENDING_APPROVAL);
        }
        offerRepository.save(offer);
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

    private OfferApproval currentPendingApproval(Offer offer) {
        if (offer.getApprovals() == null) {
            return null;
        }
        return offer.getApprovals().stream()
            .filter(a -> a.getStatus() == RequestStatus.PENDING)
            .sorted(Comparator.comparing(a -> a.getLevel() == null ? 0 : a.getLevel()))
            .findFirst()
            .orElse(null);
    }

    private Map<String, Object> approvalSummary(OfferApproval approval) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", approval.getId());
        row.put("level", approval.getLevel());
        row.put("status", approval.getStatus() != null ? approval.getStatus().getValue() : null);
        row.put("approver_id", approval.getApproverId());
        return row;
    }

    private Map<String, Object> approvalDetail(OfferApproval approval) {
        Map<String, Object> row = approvalSummary(approval);
        row.put("comments", approval.getComments());
        row.put("decided_at", approval.getDecidedAt());
        return row;
    }
}
