package com.hirepath.recruitment.dto;

public class PipelineMoveRequest {
    private String applicationId;
    private String toStageId;
    private String reason;

    public String getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(String applicationId) {
        this.applicationId = applicationId;
    }

    public String getToStageId() {
        return toStageId;
    }

    public void setToStageId(String toStageId) {
        this.toStageId = toStageId;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
