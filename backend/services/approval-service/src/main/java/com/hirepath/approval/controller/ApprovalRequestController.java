package com.hirepath.approval.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.approval.dto.ApprovalRequestActionRequest;
import com.hirepath.approval.dto.ApprovalRequestCreateRequest;
import com.hirepath.approval.dto.ApprovalRequestResponse;
import com.hirepath.approval.dto.ApprovalRequestSummaryResponse;
import com.hirepath.approval.security.service.AppUserDetails;
import com.hirepath.approval.service.ApprovalAccessService;
import com.hirepath.approval.service.ApprovalMapper;
import com.hirepath.approval.service.ApprovalQueryService;
import com.hirepath.approval.service.ApprovalRequestService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/approvals")
public class ApprovalRequestController {

    private final ApprovalRequestService requestService;
    private final ApprovalQueryService queryService;
    private final ApprovalMapper mapper;
    private final ApprovalAccessService accessService;

    public ApprovalRequestController(
        ApprovalRequestService requestService,
        ApprovalQueryService queryService,
        ApprovalMapper mapper,
        ApprovalAccessService accessService
    ) {
        this.requestService = requestService;
        this.queryService = queryService;
        this.mapper = mapper;
        this.accessService = accessService;
    }

    @PostMapping("/requests")
    public ResponseEntity<?> create(
        @RequestBody ApprovalRequestCreateRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        try {
            var saved = requestService.createRequest(request, user, false);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("id", saved.getId(), "message", "Approval request created"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @GetMapping("/requests/{id}")
    public ResponseEntity<?> get(@PathVariable UUID id, @AuthenticationPrincipal AppUserDetails user) {
        var request = requestService.getDetailed(id);
        if (request == null) {
            return ResponseEntity.notFound().build();
        }
        if (!accessService.canView(user, request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not allowed");
        }
        ApprovalRequestResponse response = mapper.toDetail(request, user);
        return ResponseEntity.ok(Map.of("data", response));
    }

    @PostMapping("/requests/{id}/actions")
    public ResponseEntity<?> act(
        @PathVariable UUID id,
        @RequestBody ApprovalRequestActionRequest action,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        try {
            var request = requestService.handleAction(id, action, user);
            if (request == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(Map.of("message", "Action applied"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @GetMapping("/inbox")
    public ResponseEntity<?> inbox(
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "module", required = false) String module,
        @RequestParam(value = "entity_type", required = false) String entityType,
        @RequestParam(value = "entity_id", required = false) String entityId,
        @RequestParam(value = "priority", required = false) String priority,
        @RequestParam(value = "overdue", required = false) Boolean overdue,
        @RequestParam(value = "q", required = false) String query,
        @RequestParam(value = "skip", defaultValue = "0") int skip,
        @RequestParam(value = "limit", defaultValue = "20") int limit,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        List<com.hirepath.approval.domain.ApprovalRequest> requests = queryService.applyFilters(
            queryService.inbox(user), status, module, entityType, entityId, priority, overdue, query);
        int total = requests.size();
        List<ApprovalRequestSummaryResponse> data = queryService.paginate(requests, skip, limit).stream()
            .map(req -> mapper.toSummary(req, user))
            .toList();
        return ResponseEntity.ok(Map.of("total", total, "data", data));
    }

    @GetMapping("/outbox")
    public ResponseEntity<?> outbox(
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "module", required = false) String module,
        @RequestParam(value = "entity_type", required = false) String entityType,
        @RequestParam(value = "entity_id", required = false) String entityId,
        @RequestParam(value = "priority", required = false) String priority,
        @RequestParam(value = "overdue", required = false) Boolean overdue,
        @RequestParam(value = "q", required = false) String query,
        @RequestParam(value = "skip", defaultValue = "0") int skip,
        @RequestParam(value = "limit", defaultValue = "20") int limit,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        List<com.hirepath.approval.domain.ApprovalRequest> requests = queryService.applyFilters(
            queryService.outbox(user), status, module, entityType, entityId, priority, overdue, query);
        int total = requests.size();
        List<ApprovalRequestSummaryResponse> data = queryService.paginate(requests, skip, limit).stream()
            .map(req -> mapper.toSummary(req, user))
            .toList();
        return ResponseEntity.ok(Map.of("total", total, "data", data));
    }

    @GetMapping("/history")
    public ResponseEntity<?> history(
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "module", required = false) String module,
        @RequestParam(value = "entity_type", required = false) String entityType,
        @RequestParam(value = "entity_id", required = false) String entityId,
        @RequestParam(value = "priority", required = false) String priority,
        @RequestParam(value = "overdue", required = false) Boolean overdue,
        @RequestParam(value = "q", required = false) String query,
        @RequestParam(value = "skip", defaultValue = "0") int skip,
        @RequestParam(value = "limit", defaultValue = "20") int limit,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        List<com.hirepath.approval.domain.ApprovalRequest> requests = queryService.applyFilters(
            queryService.history(user), status, module, entityType, entityId, priority, overdue, query);
        int total = requests.size();
        List<ApprovalRequestSummaryResponse> data = queryService.paginate(requests, skip, limit).stream()
            .map(req -> mapper.toSummary(req, user))
            .toList();
        return ResponseEntity.ok(Map.of("total", total, "data", data));
    }

    @GetMapping("/kpis")
    public ResponseEntity<?> kpis(
        @RequestParam(value = "scope", defaultValue = "inbox") String scope,
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "module", required = false) String module,
        @RequestParam(value = "entity_type", required = false) String entityType,
        @RequestParam(value = "entity_id", required = false) String entityId,
        @RequestParam(value = "priority", required = false) String priority,
        @RequestParam(value = "overdue", required = false) Boolean overdue,
        @RequestParam(value = "q", required = false) String query,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        List<com.hirepath.approval.domain.ApprovalRequest> base;
        if ("outbox".equalsIgnoreCase(scope)) {
            base = queryService.outbox(user);
        } else if ("history".equalsIgnoreCase(scope)) {
            base = queryService.history(user);
        } else {
            base = queryService.inbox(user);
        }
        List<com.hirepath.approval.domain.ApprovalRequest> requests = queryService.applyFilters(
            base, status, module, entityType, entityId, priority, overdue, query);
        return ResponseEntity.ok(Map.of("data", queryService.computeKpis(requests)));
    }
}
