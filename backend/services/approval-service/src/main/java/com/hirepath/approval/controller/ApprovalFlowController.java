package com.hirepath.approval.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.approval.domain.ApprovalFlow;
import com.hirepath.approval.domain.ApprovalFlowStage;
import com.hirepath.approval.dto.ApprovalFlowCreateRequest;
import com.hirepath.approval.dto.ApprovalFlowResponse;
import com.hirepath.approval.dto.ApprovalFlowUpdateRequest;
import com.hirepath.approval.repository.ApprovalFlowRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/approval-flows")
public class ApprovalFlowController {

    private final ApprovalFlowRepository repository;

    public ApprovalFlowController(ApprovalFlowRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Map<String, List<ApprovalFlowResponse>> list() {
        List<ApprovalFlowResponse> data = repository.findAll().stream()
            .map(this::toResponse)
            .toList();
        return Map.of("data", data);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApprovalFlowResponse> get(@PathVariable UUID id) {
        return repository.findById(id)
            .map(flow -> ResponseEntity.ok(toResponse(flow)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ApprovalFlowCreateRequest request) {
        if (request.getStages() == null || request.getStages().isEmpty()) {
            return ResponseEntity.badRequest().body("At least one stage is required");
        }
        ApprovalFlow flow = new ApprovalFlow();
        flow.setName(request.getName());
        flow.setDescription(request.getDescription());
        flow.setActive(request.isActive());

        for (ApprovalFlowCreateRequest.StageRequest stageReq : request.getStages()) {
            if (stageReq.getOrder() < 1) {
                return ResponseEntity.badRequest().body("Stage order must be >= 1");
            }
            if ((stageReq.getRole() == null || stageReq.getRole().isBlank())
                && (stageReq.getApproverUserId() == null || stageReq.getApproverUserId().isBlank())) {
                return ResponseEntity.badRequest().body("Stage requires role or approver_user_id");
            }
            ApprovalFlowStage stage = new ApprovalFlowStage();
            stage.setFlow(flow);
            stage.setOrderIndex(stageReq.getOrder());
            stage.setRole(stageReq.getRole());
            if (stageReq.getApproverUserId() != null && !stageReq.getApproverUserId().isBlank()) {
                stage.setApproverUserId(UUID.fromString(stageReq.getApproverUserId()));
            }
            stage.setActionLabel(stageReq.getActionLabel());
            flow.getStages().add(stage);
        }

        ApprovalFlow saved = repository.save(flow);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", saved.getId(), "message", "Approval flow created"));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody ApprovalFlowUpdateRequest request) {
        ApprovalFlow flow = repository.findById(id).orElse(null);
        if (flow == null) {
            return ResponseEntity.notFound().build();
        }
        if (request.getName() != null && !request.getName().isBlank()) {
            flow.setName(request.getName());
        }
        if (request.getDescription() != null) {
            flow.setDescription(request.getDescription());
        }
        if (request.getActive() != null) {
            flow.setActive(request.getActive());
        }
        ApprovalFlow saved = repository.save(flow);
        return ResponseEntity.ok(Map.of("data", toResponse(saved)));
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
