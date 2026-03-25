package com.hirepath.approval.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ApprovalAssignmentStatus {
    DRAFT("draft"),
    PENDING("pending"),
    APPROVED("approved"),
    REJECTED("rejected"),
    CANCELLED("cancelled"),
    CHANGES_REQUESTED("changes_requested");

    private final String value;

    ApprovalAssignmentStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
