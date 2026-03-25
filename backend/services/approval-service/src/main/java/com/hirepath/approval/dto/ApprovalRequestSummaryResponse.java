package com.hirepath.approval.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ApprovalRequestSummaryResponse {
    private String id;
    private String title;
    private String summary;
    private String module;
    private String entityType;
    private String entityId;
    private String status;
    private String priority;
    private String requesterId;
    private String requesterName;
    private String requestedAt;
    private String dueAt;
    private String currentStage;
    private boolean canAct;
    private boolean overdue;

    public ApprovalRequestSummaryResponse() {}

    public ApprovalRequestSummaryResponse(String id, String title, String summary, String module, String entityType,
                                          String entityId, String status, String priority, String requesterId,
                                          String requesterName, String requestedAt, String dueAt, String currentStage,
                                          boolean canAct, boolean overdue) {
        this.id = id;
        this.title = title;
        this.summary = summary;
        this.module = module;
        this.entityType = entityType;
        this.entityId = entityId;
        this.status = status;
        this.priority = priority;
        this.requesterId = requesterId;
        this.requesterName = requesterName;
        this.requestedAt = requestedAt;
        this.dueAt = dueAt;
        this.currentStage = currentStage;
        this.canAct = canAct;
        this.overdue = overdue;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getDueAt() {
        return dueAt;
    }

    public void setDueAt(String dueAt) {
        this.dueAt = dueAt;
    }

    public String getCurrentStage() {
        return currentStage;
    }

    public void setCurrentStage(String currentStage) {
        this.currentStage = currentStage;
    }

    public boolean isCanAct() {
        return canAct;
    }

    public void setCanAct(boolean canAct) {
        this.canAct = canAct;
    }

    public boolean isOverdue() {
        return overdue;
    }

    public void setOverdue(boolean overdue) {
        this.overdue = overdue;
    }
}
