package com.hirepath.approval.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ApprovalFlowUpdateRequest {
    private String name;
    private String description;
    @JsonProperty("is_active")
    private Boolean active;
    private String version;
    private String status;
    private java.util.List<ApprovalFlowCreateRequest.StageRequest> stages;

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

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
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

    public java.util.List<ApprovalFlowCreateRequest.StageRequest> getStages() {
        return stages;
    }

    public void setStages(java.util.List<ApprovalFlowCreateRequest.StageRequest> stages) {
        this.stages = stages;
    }
}
