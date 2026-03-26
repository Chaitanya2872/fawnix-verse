package com.hirepath.approval.controller;

import java.util.List;
import java.util.Map;

import com.hirepath.approval.dto.ApprovalRequestCreateRequest;
import com.hirepath.approval.dto.ApprovalRequestSummaryResponse;
import com.hirepath.approval.dto.InternalApprovalActionRequest;
import com.hirepath.approval.repository.ApprovalRequestRepository;
import com.hirepath.approval.service.ApprovalMapper;
import com.hirepath.approval.service.ApprovalQueryService;
import com.hirepath.approval.service.ApprovalRequestService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/approvals")
public class InternalApprovalsController {

    private final ApprovalRequestService requestService;
    private final ApprovalQueryService queryService;
    private final ApprovalMapper mapper;
    private final ApprovalRequestRepository requestRepository;

    public InternalApprovalsController(
        ApprovalRequestService requestService,
        ApprovalQueryService queryService,
        ApprovalMapper mapper,
        ApprovalRequestRepository requestRepository
    ) {
        this.requestService = requestService;
        this.queryService = queryService;
        this.mapper = mapper;
        this.requestRepository = requestRepository;
    }

    @PostMapping("/requests")
    public ResponseEntity<?> create(@RequestBody ApprovalRequestCreateRequest request) {
        try {
            var saved = requestService.createRequest(request, null, true);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("id", saved.getId(), "message", "Approval request created"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/requests/{id}/actions")
    public ResponseEntity<?> act(@PathVariable("id") java.util.UUID id, @RequestBody InternalApprovalActionRequest action) {
        try {
            var updated = requestService.handleInternalAction(id, action);
            if (updated == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(Map.of("message", "Action applied"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @GetMapping("/status")
    public ResponseEntity<?> status(
        @RequestParam("module") String module,
        @RequestParam("entity_type") String entityType,
        @RequestParam("entity_id") String entityId
    ) {
        var request = requestService.findByEntity(module, entityType, entityId);
        if (request == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of(
            "request_id", request.getId(),
            "status", request.getStatus() != null ? request.getStatus().getValue() : null
        ));
    }

    @GetMapping("/requests")
    public ResponseEntity<?> list(
        @RequestParam("module") String module,
        @RequestParam(value = "entity_type", required = false) String entityType,
        @RequestParam(value = "entity_id", required = false) String entityId
    ) {
        List<com.hirepath.approval.domain.ApprovalRequest> requests = queryService.applyFilters(
            requestRepository.findAll(), null, module, entityType, entityId, null, null, null
        );
        List<ApprovalRequestSummaryResponse> data = requests.stream()
            .map(req -> mapper.toSummary(req, null))
            .toList();
        return ResponseEntity.ok(Map.of("data", data));
    }
}
