package com.hirepath.approval.dto;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ApprovalFlowResponse {
    private String id;
    private String name;
    private String description;
    private boolean isActive;
    private String version;
    private String status;
    private String createdAt;
    private String updatedAt;
    private List<ApprovalStageResponse> stages;

    public ApprovalFlowResponse() {}

    public ApprovalFlowResponse(String id, String name, String description, boolean isActive, String version, String status,
                                String createdAt, String updatedAt, List<ApprovalStageResponse> stages) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.isActive = isActive;
        this.version = version;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.stages = stages;
    }

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

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
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
        private int order;
        private String role;
        private String approverUserId;
        private String actionLabel;
        private Boolean requiresAll;
        private Integer slaDays;

        public ApprovalStageResponse() {}

        public ApprovalStageResponse(String id, int order, String role, String approverUserId, String actionLabel,
                                     Boolean requiresAll, Integer slaDays) {
            this.id = id;
            this.order = order;
            this.role = role;
            this.approverUserId = approverUserId;
            this.actionLabel = actionLabel;
            this.requiresAll = requiresAll;
            this.slaDays = slaDays;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

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

        public Boolean getRequiresAll() {
            return requiresAll;
        }

        public void setRequiresAll(Boolean requiresAll) {
            this.requiresAll = requiresAll;
        }

        public Integer getSlaDays() {
            return slaDays;
        }

        public void setSlaDays(Integer slaDays) {
            this.slaDays = slaDays;
        }
    }
}
