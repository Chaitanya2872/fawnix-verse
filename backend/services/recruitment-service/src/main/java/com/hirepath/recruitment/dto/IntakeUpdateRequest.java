package com.hirepath.recruitment.dto;

public class IntakeUpdateRequest {
    private String status;
    private String reviewerId;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReviewerId() {
        return reviewerId;
    }

    public void setReviewerId(String reviewerId) {
        this.reviewerId = reviewerId;
    }
}
