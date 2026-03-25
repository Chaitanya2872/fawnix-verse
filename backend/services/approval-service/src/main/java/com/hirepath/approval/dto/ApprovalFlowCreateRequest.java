package com.hirepath.approval.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ApprovalFlowCreateRequest {
    private String name;
    private String description;
    @JsonProperty("is_active")
    private boolean active = true;
    private List<StageRequest> stages;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public List<StageRequest> getStages() {
        return stages;
    }

    public void setStages(List<StageRequest> stages) {
        this.stages = stages;
    }

    public static class StageRequest {
        private int order;
        private String role;
        @JsonProperty("approver_user_id")
        private String approverUserId;
        @JsonProperty("action_label")
        private String actionLabel;

        public int getOrder() {
            return order;
        }

        public void setOrder(int order) {
            this.order = order;
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
    }
}
