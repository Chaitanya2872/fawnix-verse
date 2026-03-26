package com.hirepath.recruitment.client.dto;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ApprovalFlowResponse {
    private String id;
    private String name;
    private String description;
    private boolean isActive;
    private List<ApprovalStageResponse> stages;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

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
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public List<ApprovalStageResponse> getStages() {
        return stages;
    }

    public void setStages(List<ApprovalStageResponse> stages) {
        this.stages = stages;
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class ApprovalStageResponse {
        private String id;
        private Integer order;
        private String role;
        private String approverUserId;
        private String actionLabel;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public Integer getOrder() {
            return order;
        }

        public void setOrder(Integer order) {
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
