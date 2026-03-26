package com.hirepath.approval.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.hirepath.approval.domain.ApprovalFlow;
import com.hirepath.approval.domain.ApprovalFlowStage;
import com.hirepath.approval.dto.ApprovalFlowCreateRequest;
import com.hirepath.approval.dto.ApprovalFlowUpdateRequest;
import com.hirepath.approval.repository.ApprovalFlowRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApprovalFlowService {

    private final ApprovalFlowRepository repository;

    public ApprovalFlowService(ApprovalFlowRepository repository) {
        this.repository = repository;
    }

    public List<ApprovalFlow> list(String query, Boolean active, String status) {
        List<ApprovalFlow> flows = repository.findAll();
        if (query != null && !query.isBlank()) {
            String q = query.trim().toLowerCase(Locale.ROOT);
            flows = flows.stream()
                .filter(flow -> (flow.getName() != null && flow.getName().toLowerCase(Locale.ROOT).contains(q))
                    || (flow.getDescription() != null && flow.getDescription().toLowerCase(Locale.ROOT).contains(q)))
                .toList();
        }
        if (active != null) {
            flows = flows.stream().filter(flow -> flow.isActive() == active).toList();
        }
        if (status != null && !status.isBlank()) {
            String normalized = status.trim().toLowerCase(Locale.ROOT);
            flows = flows.stream().filter(flow -> flow.getStatus() != null
                && flow.getStatus().toLowerCase(Locale.ROOT).equals(normalized)).toList();
        }
        return flows;
    }

    public ApprovalFlow get(UUID id) {
        return repository.findById(id).orElse(null);
    }

    @Transactional
    public ApprovalFlow create(ApprovalFlowCreateRequest request) {
        validateStages(request.getStages());
        ApprovalFlow flow = new ApprovalFlow();
        flow.setName(request.getName());
        flow.setDescription(request.getDescription());
        flow.setActive(request.isActive());
        if (request.getVersion() != null && !request.getVersion().isBlank()) {
            flow.setVersion(request.getVersion());
        }
        flow.setStages(buildStages(flow, request.getStages()));
        return repository.save(flow);
    }

    @Transactional
    public ApprovalFlow update(UUID id, ApprovalFlowUpdateRequest request) {
        ApprovalFlow flow = repository.findById(id).orElse(null);
        if (flow == null) {
            return null;
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
        if (request.getVersion() != null && !request.getVersion().isBlank()) {
            flow.setVersion(request.getVersion());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            flow.setStatus(request.getStatus());
        }
        if (request.getStages() != null && !request.getStages().isEmpty()) {
            validateStages(request.getStages());
            flow.getStages().clear();
            flow.getStages().addAll(buildStages(flow, request.getStages()));
        }
        return repository.save(flow);
    }

    @Transactional
    public ApprovalFlow deactivate(UUID id) {
        ApprovalFlow flow = repository.findById(id).orElse(null);
        if (flow == null) {
            return null;
        }
        flow.setActive(false);
        flow.setStatus("inactive");
        return repository.save(flow);
    }

    private List<ApprovalFlowStage> buildStages(ApprovalFlow flow, List<ApprovalFlowCreateRequest.StageRequest> stages) {
        List<ApprovalFlowStage> list = new ArrayList<>();
        for (ApprovalFlowCreateRequest.StageRequest stageReq : stages) {
            ApprovalFlowStage stage = new ApprovalFlowStage();
            stage.setFlow(flow);
            stage.setOrderIndex(stageReq.getOrder());
            stage.setRole(stageReq.getRole());
            if (stageReq.getApproverUserId() != null && !stageReq.getApproverUserId().isBlank()) {
                stage.setApproverUserId(UUID.fromString(stageReq.getApproverUserId()));
            }
            stage.setActionLabel(stageReq.getActionLabel());
            if (stageReq.getRequiresAll() != null) {
                stage.setRequiresAll(stageReq.getRequiresAll());
            }
            stage.setSlaDays(stageReq.getSlaDays());
            list.add(stage);
        }
        return list;
    }

    private void validateStages(List<ApprovalFlowCreateRequest.StageRequest> stages) {
        if (stages == null || stages.isEmpty()) {
            throw new IllegalArgumentException("At least one stage is required");
        }
        for (ApprovalFlowCreateRequest.StageRequest stageReq : stages) {
            if (stageReq.getOrder() < 1) {
                throw new IllegalArgumentException("Stage order must be >= 1");
            }
            boolean hasRole = stageReq.getRole() != null && !stageReq.getRole().isBlank();
            boolean hasUser = stageReq.getApproverUserId() != null && !stageReq.getApproverUserId().isBlank();
            if (!hasRole && !hasUser) {
                throw new IllegalArgumentException("Stage requires role or approver_user_id");
            }
        }
    }
}
