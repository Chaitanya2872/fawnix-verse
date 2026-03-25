package com.hirepath.approval.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.approval.domain.ApprovalFlow;
import com.hirepath.approval.dto.ApprovalFlowResponse;
import com.hirepath.approval.repository.ApprovalFlowRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/approval-flows")
public class InternalApprovalController {

    private final ApprovalFlowRepository repository;

    public InternalApprovalController(ApprovalFlowRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        List<ApprovalFlow> flows = repository.findAll();
        long active = flows.stream().filter(ApprovalFlow::isActive).count();
        return Map.of(
            "total", flows.size(),
            "active", (int) active
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApprovalFlowResponse> get(@PathVariable UUID id) {
        return repository.findById(id)
            .map(flow -> ResponseEntity.ok(toResponse(flow)))
            .orElse(ResponseEntity.notFound().build());
    }

    private ApprovalFlowResponse toResponse(ApprovalFlow flow) {
        List<ApprovalFlowResponse.ApprovalStageResponse> stages = flow.getStages().stream()
            .map(stage -> new ApprovalFlowResponse.ApprovalStageResponse(
                stage.getId() != null ? stage.getId().toString() : null,
                stage.getOrderIndex(),
                stage.getRole(),
                stage.getApproverUserId() != null ? stage.getApproverUserId().toString() : null,
                stage.getActionLabel()
            ))
            .toList();
        return new ApprovalFlowResponse(
            flow.getId() != null ? flow.getId().toString() : null,
            flow.getName(),
            flow.getDescription(),
            flow.isActive(),
            stages
        );
    }
}
