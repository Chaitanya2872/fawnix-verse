package com.hirepath.recruitment.dto;

public class DecisionCreateRequest {
    private String applicationId;
    private String decisionStatus;
    private String decisionReason;
    private String decisionNotes;
    private Integer decisionScore;

    public String getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(String applicationId) {
        this.applicationId = applicationId;
    }

    public String getDecisionStatus() {
        return decisionStatus;
    }

    public void setDecisionStatus(String decisionStatus) {
        this.decisionStatus = decisionStatus;
    }

    public String getDecisionReason() {
        return decisionReason;
    }

    public void setDecisionReason(String decisionReason) {
        this.decisionReason = decisionReason;
    }

    public String getDecisionNotes() {
        return decisionNotes;
    }

    public void setDecisionNotes(String decisionNotes) {
        this.decisionNotes = decisionNotes;
    }

    public Integer getDecisionScore() {
        return decisionScore;
    }

    public void setDecisionScore(Integer decisionScore) {
        this.decisionScore = decisionScore;
    }
}
