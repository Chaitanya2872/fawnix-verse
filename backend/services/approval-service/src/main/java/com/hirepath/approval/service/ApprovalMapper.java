package com.hirepath.approval.service;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;

import com.hirepath.approval.domain.ApprovalAction;
import com.hirepath.approval.domain.ApprovalFlow;
import com.hirepath.approval.domain.ApprovalFlowStage;
import com.hirepath.approval.domain.ApprovalRequest;
import com.hirepath.approval.domain.ApprovalRequestAssignment;
import com.hirepath.approval.domain.ApprovalRequestStage;
import com.hirepath.approval.dto.ApprovalFlowResponse;
import com.hirepath.approval.dto.ApprovalRequestResponse;
import com.hirepath.approval.dto.ApprovalRequestSummaryResponse;
import com.hirepath.approval.security.service.AppUserDetails;

import org.springframework.stereotype.Component;

@Component
public class ApprovalMapper {

    private final ApprovalAccessService accessService;

    public ApprovalMapper(ApprovalAccessService accessService) {
        this.accessService = accessService;
    }

    public ApprovalFlowResponse toFlowResponse(ApprovalFlow flow) {
        List<ApprovalFlowResponse.ApprovalStageResponse> stages = flow.getStages().stream()
            .sorted(Comparator.comparing(ApprovalFlowStage::getOrderIndex))
            .map(stage -> new ApprovalFlowResponse.ApprovalStageResponse(
                stage.getId() != null ? stage.getId().toString() : null,
                stage.getOrderIndex(),
                stage.getRole(),
                stage.getApproverUserId() != null ? stage.getApproverUserId().toString() : null,
                stage.getActionLabel(),
                stage.isRequiresAll(),
                stage.getSlaDays()
            ))
            .toList();
        return new ApprovalFlowResponse(
            flow.getId() != null ? flow.getId().toString() : null,
            flow.getName(),
            flow.getDescription(),
            flow.isActive(),
            flow.getVersion(),
            flow.getStatus(),
            flow.getCreatedAt() != null ? flow.getCreatedAt().toString() : null,
            flow.getUpdatedAt() != null ? flow.getUpdatedAt().toString() : null,
            stages
        );
    }

    public ApprovalRequestSummaryResponse toSummary(ApprovalRequest request, AppUserDetails user) {
        ApprovalRequestStage stage = request.getCurrentStage();
        String currentStageLabel = stage != null
            ? (stage.getActionLabel() != null && !stage.getActionLabel().isBlank()
                ? stage.getActionLabel()
                : (stage.getRole() != null ? stage.getRole() : "user"))
            : null;
        boolean canAct = accessService.canAct(user, request);
        boolean overdue = isOverdue(request);
        return new ApprovalRequestSummaryResponse(
            request.getId() != null ? request.getId().toString() : null,
            request.getTitle(),
            request.getSummary(),
            request.getModule(),
            request.getEntityType(),
            request.getEntityId(),
            request.getStatus() != null ? request.getStatus().getValue() : null,
            request.getPriority() != null ? request.getPriority().getValue() : null,
            request.getRequesterId(),
            request.getRequesterName(),
            request.getRequestedAt() != null ? request.getRequestedAt().toString() : null,
            stage != null && stage.getDueAt() != null ? stage.getDueAt().toString()
                : (request.getDueAt() != null ? request.getDueAt().toString() : null),
            currentStageLabel,
            canAct,
            overdue
        );
    }

    public ApprovalRequestResponse toDetail(ApprovalRequest request, AppUserDetails user) {
        List<ApprovalRequestResponse.StageResponse> stages = request.getStages().stream()
            .sorted(Comparator.comparing(ApprovalRequestStage::getStageOrder))
            .map(stage -> new ApprovalRequestResponse.StageResponse(
                stage.getId() != null ? stage.getId().toString() : null,
                stage.getStageOrder(),
                stage.getStatus() != null ? stage.getStatus().getValue() : null,
                stage.getDueAt() != null ? stage.getDueAt().toString() : null,
                stage.getSlaDays(),
                stage.isRequiresAll(),
                stage.getRole(),
                stage.getApproverUserId(),
                stage.getActionLabel(),
                stage.getCreatedAt() != null ? stage.getCreatedAt().toString() : null,
                stage.getCompletedAt() != null ? stage.getCompletedAt().toString() : null,
                stage.getAssignments() != null
                    ? stage.getAssignments().stream().map(this::toAssignment).toList()
                    : List.of()
            ))
            .toList();

        List<ApprovalRequestResponse.ActionResponse> actions = request.getActions() != null
            ? request.getActions().stream()
                .sorted(Comparator.comparing(ApprovalAction::getCreatedAt))
                .map(this::toAction)
                .toList()
            : List.of();

        return new ApprovalRequestResponse(
            request.getId() != null ? request.getId().toString() : null,
            request.getFlowId() != null ? request.getFlowId().toString() : null,
            request.getModule(),
            request.getEntityType(),
            request.getEntityId(),
            request.getTitle(),
            request.getSummary(),
            request.getRequesterId(),
            request.getRequesterName(),
            request.getRequestedAt() != null ? request.getRequestedAt().toString() : null,
            request.getStatus() != null ? request.getStatus().getValue() : null,
            request.getPriority() != null ? request.getPriority().getValue() : null,
            request.getDueAt() != null ? request.getDueAt().toString() : null,
            request.getCurrentStage() != null && request.getCurrentStage().getId() != null
                ? request.getCurrentStage().getId().toString() : null,
            request.getPayloadSnapshot(),
            accessService.canAct(user, request),
            stages,
            actions
        );
    }

    private ApprovalRequestResponse.AssignmentResponse toAssignment(ApprovalRequestAssignment assignment) {
        return new ApprovalRequestResponse.AssignmentResponse(
            assignment.getId() != null ? assignment.getId().toString() : null,
            assignment.getAssigneeType() != null ? assignment.getAssigneeType().getValue() : null,
            assignment.getAssigneeValue(),
            assignment.getStatus() != null ? assignment.getStatus().getValue() : null,
            assignment.getActedAt() != null ? assignment.getActedAt().toString() : null
        );
    }

    private ApprovalRequestResponse.ActionResponse toAction(ApprovalAction action) {
        return new ApprovalRequestResponse.ActionResponse(
            action.getId() != null ? action.getId().toString() : null,
            action.getStage() != null && action.getStage().getId() != null ? action.getStage().getId().toString() : null,
            action.getActorId(),
            action.getActionType() != null ? action.getActionType().getValue() : null,
            action.getPreviousStatus(),
            action.getNewStatus(),
            action.getComment(),
            action.getCreatedAt() != null ? action.getCreatedAt().toString() : null
        );
    }

    private boolean isOverdue(ApprovalRequest request) {
        ApprovalRequestStage stage = request.getCurrentStage();
        if (stage == null || stage.getDueAt() == null) {
            return false;
        }
        if (request.getStatus() == null) {
            return false;
        }
        switch (request.getStatus()) {
            case APPROVED:
            case REJECTED:
            case CANCELLED:
                return false;
            default:
                break;
        }
        return stage.getDueAt().isBefore(OffsetDateTime.now());
    }
}
