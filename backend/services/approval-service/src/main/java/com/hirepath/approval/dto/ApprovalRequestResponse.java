package com.hirepath.approval.dto;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ApprovalRequestResponse {
    private String id;
    private String flowId;
    private String module;
    private String entityType;
    private String entityId;
    private String title;
    private String summary;
    private String requesterId;
    private String requesterName;
    private String requestedAt;
    private String status;
    private String priority;
    private String dueAt;
    private String currentStageId;
    private String payloadSnapshot;
    private boolean canAct;
    private List<StageResponse> stages;
    private List<ActionResponse> actions;

    public ApprovalRequestResponse() {}

    public ApprovalRequestResponse(String id, String flowId, String module, String entityType, String entityId,
                                   String title, String summary, String requesterId, String requesterName,
                                   String requestedAt, String status, String priority, String dueAt,
                                   String currentStageId, String payloadSnapshot, boolean canAct,
                                   List<StageResponse> stages, List<ActionResponse> actions) {
        this.id = id;
        this.flowId = flowId;
        this.module = module;
        this.entityType = entityType;
        this.entityId = entityId;
        this.title = title;
        this.summary = summary;
        this.requesterId = requesterId;
        this.requesterName = requesterName;
        this.requestedAt = requestedAt;
        this.status = status;
        this.priority = priority;
        this.dueAt = dueAt;
        this.currentStageId = currentStageId;
        this.payloadSnapshot = payloadSnapshot;
        this.canAct = canAct;
        this.stages = stages;
        this.actions = actions;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFlowId() {
        return flowId;
    }

    public void setFlowId(String flowId) {
        this.flowId = flowId;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getRequesterId() {
        return requesterId;
    }

    public void setRequesterId(String requesterId) {
        this.requesterId = requesterId;
    }

    public String getRequesterName() {
        return requesterName;
    }

    public void setRequesterName(String requesterName) {
        this.requesterName = requesterName;
    }

    public String getRequestedAt() {
        return requestedAt;
    }

    public void setRequestedAt(String requestedAt) {
        this.requestedAt = requestedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getDueAt() {
        return dueAt;
    }

    public void setDueAt(String dueAt) {
        this.dueAt = dueAt;
    }

    public String getCurrentStageId() {
        return currentStageId;
    }

    public void setCurrentStageId(String currentStageId) {
        this.currentStageId = currentStageId;
    }

    public String getPayloadSnapshot() {
        return payloadSnapshot;
    }

    public void setPayloadSnapshot(String payloadSnapshot) {
        this.payloadSnapshot = payloadSnapshot;
    }

    public boolean isCanAct() {
        return canAct;
    }

    public void setCanAct(boolean canAct) {
        this.canAct = canAct;
    }

    public List<StageResponse> getStages() {
        return stages;
    }

    public void setStages(List<StageResponse> stages) {
        this.stages = stages;
    }

    public List<ActionResponse> getActions() {
        return actions;
    }

    public void setActions(List<ActionResponse> actions) {
        this.actions = actions;
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class StageResponse {
        private String id;
        private int stageOrder;
        private String status;
        private String dueAt;
        private Integer slaDays;
        private boolean requiresAll;
        private String role;
        private String approverUserId;
        private String actionLabel;
        private String createdAt;
        private String completedAt;
        private List<AssignmentResponse> assignments;

        public StageResponse() {}

        public StageResponse(String id, int stageOrder, String status, String dueAt, Integer slaDays, boolean requiresAll, String role,
                             String approverUserId, String actionLabel, String createdAt, String completedAt,
                             List<AssignmentResponse> assignments) {
            this.id = id;
            this.stageOrder = stageOrder;
            this.status = status;
            this.dueAt = dueAt;
            this.slaDays = slaDays;
            this.requiresAll = requiresAll;
            this.role = role;
            this.approverUserId = approverUserId;
            this.actionLabel = actionLabel;
            this.createdAt = createdAt;
            this.completedAt = completedAt;
            this.assignments = assignments;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public int getStageOrder() {
            return stageOrder;
        }

        public void setStageOrder(int stageOrder) {
            this.stageOrder = stageOrder;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getDueAt() {
            return dueAt;
        }

        public void setDueAt(String dueAt) {
            this.dueAt = dueAt;
        }

        public Integer getSlaDays() {
            return slaDays;
        }

        public void setSlaDays(Integer slaDays) {
            this.slaDays = slaDays;
        }

        public boolean isRequiresAll() {
            return requiresAll;
        }

        public void setRequiresAll(boolean requiresAll) {
            this.requiresAll = requiresAll;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getApproverUserId() {
            return approverUserId;
        }

        public void setApproverUserId(String approverUserId) {
            this.approverUserId = approverUserId;
        }

        public String getActionLabel() {
            return actionLabel;
        }

        public void setActionLabel(String actionLabel) {
            this.actionLabel = actionLabel;
        }

        public String getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(String createdAt) {
            this.createdAt = createdAt;
        }

        public String getCompletedAt() {
            return completedAt;
        }

        public void setCompletedAt(String completedAt) {
            this.completedAt = completedAt;
        }

        public List<AssignmentResponse> getAssignments() {
            return assignments;
        }

        public void setAssignments(List<AssignmentResponse> assignments) {
            this.assignments = assignments;
        }
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class AssignmentResponse {
        private String id;
        private String assigneeType;
        private String assigneeValue;
        private String status;
        private String actedAt;

        public AssignmentResponse() {}

        public AssignmentResponse(String id, String assigneeType, String assigneeValue, String status, String actedAt) {
            this.id = id;
            this.assigneeType = assigneeType;
            this.assigneeValue = assigneeValue;
            this.status = status;
            this.actedAt = actedAt;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getAssigneeType() {
            return assigneeType;
        }

        public void setAssigneeType(String assigneeType) {
            this.assigneeType = assigneeType;
        }

        public String getAssigneeValue() {
            return assigneeValue;
        }

        public void setAssigneeValue(String assigneeValue) {
            this.assigneeValue = assigneeValue;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getActedAt() {
            return actedAt;
        }

        public void setActedAt(String actedAt) {
            this.actedAt = actedAt;
        }
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class ActionResponse {
        private String id;
        private String stageId;
        private String actorId;
        private String actionType;
        private String previousStatus;
        private String newStatus;
        private String comment;
        private String createdAt;

        public ActionResponse() {}

        public ActionResponse(String id, String stageId, String actorId, String actionType, String previousStatus,
                              String newStatus, String comment, String createdAt) {
            this.id = id;
            this.stageId = stageId;
            this.actorId = actorId;
            this.actionType = actionType;
            this.previousStatus = previousStatus;
            this.newStatus = newStatus;
            this.comment = comment;
            this.createdAt = createdAt;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getStageId() {
            return stageId;
        }

        public void setStageId(String stageId) {
            this.stageId = stageId;
        }

        public String getActorId() {
            return actorId;
        }

        public void setActorId(String actorId) {
            this.actorId = actorId;
        }

        public String getActionType() {
            return actionType;
        }

        public void setActionType(String actionType) {
            this.actionType = actionType;
        }

        public String getPreviousStatus() {
            return previousStatus;
        }

        public void setPreviousStatus(String previousStatus) {
            this.previousStatus = previousStatus;
        }

        public String getNewStatus() {
            return newStatus;
        }

        public void setNewStatus(String newStatus) {
            this.newStatus = newStatus;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
        }

        public String getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(String createdAt) {
            this.createdAt = createdAt;
        }
    }
}
