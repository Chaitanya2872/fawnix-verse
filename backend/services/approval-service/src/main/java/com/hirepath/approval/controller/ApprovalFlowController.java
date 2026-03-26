package com.hirepath.approval.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.approval.dto.ApprovalFlowCreateRequest;
import com.hirepath.approval.dto.ApprovalFlowResponse;
import com.hirepath.approval.dto.ApprovalFlowUpdateRequest;
import com.hirepath.approval.service.ApprovalFlowService;
import com.hirepath.approval.service.ApprovalMapper;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/approval-flows")
public class ApprovalFlowController {

    private final ApprovalFlowService flowService;
    private final ApprovalMapper mapper;

    public ApprovalFlowController(ApprovalFlowService flowService, ApprovalMapper mapper) {
        this.flowService = flowService;
        this.mapper = mapper;
    }

    @GetMapping
    public Map<String, List<ApprovalFlowResponse>> list(
        @RequestParam(value = "q", required = false) String query,
        @RequestParam(value = "active", required = false) Boolean active,
        @RequestParam(value = "status", required = false) String status
    ) {
        List<ApprovalFlowResponse> data = flowService.list(query, active, status).stream()
            .map(mapper::toFlowResponse)
            .toList();
        return Map.of("data", data);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApprovalFlowResponse> get(@PathVariable UUID id) {
        var flow = flowService.get(id);
        if (flow == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(mapper.toFlowResponse(flow));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_HR_MANAGER')")
    public ResponseEntity<?> create(@RequestBody ApprovalFlowCreateRequest request) {
        try {
            var saved = flowService.create(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("id", saved.getId(), "message", "Approval flow created"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_HR_MANAGER')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody ApprovalFlowUpdateRequest request) {
        try {
            var saved = flowService.update(id, request);
            if (saved == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(Map.of("data", mapper.toFlowResponse(saved)));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_HR_MANAGER')")
    public ResponseEntity<?> deactivate(@PathVariable UUID id) {
        var saved = flowService.deactivate(id);
        if (saved == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("message", "Flow deactivated"));
    }
}
