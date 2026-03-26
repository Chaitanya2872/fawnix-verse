package com.hirepath.approval.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ApprovalStageStatus {
    DRAFT("draft"),
    PENDING("pending"),
    IN_REVIEW("in_review"),
    APPROVED("approved"),
    REJECTED("rejected"),
    CANCELLED("cancelled"),
    CHANGES_REQUESTED("changes_requested");

    private final String value;

    ApprovalStageStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
