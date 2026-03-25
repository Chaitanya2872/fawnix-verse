package com.hirepath.approval.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.approval.dto.ApprovalFlowResponse;
import com.hirepath.approval.service.ApprovalFlowService;
import com.hirepath.approval.service.ApprovalMapper;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/approval-flows")
public class InternalApprovalController {

    private final ApprovalFlowService flowService;
    private final ApprovalMapper mapper;

    public InternalApprovalController(ApprovalFlowService flowService, ApprovalMapper mapper) {
        this.flowService = flowService;
        this.mapper = mapper;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        List<ApprovalFlowResponse> flows = flowService.list(null, null, null).stream()
            .map(mapper::toFlowResponse)
            .toList();
        long active = flows.stream().filter(ApprovalFlowResponse::isActive).count();
        return Map.of(
            "total", flows.size(),
            "active", (int) active
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApprovalFlowResponse> get(@PathVariable UUID id) {
        var flow = flowService.get(id);
        if (flow == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(mapper.toFlowResponse(flow));
    }
}
