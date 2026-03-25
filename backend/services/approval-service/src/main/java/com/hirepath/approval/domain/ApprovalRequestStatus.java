package com.hirepath.approval.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ApprovalRequestStatus {
    DRAFT("draft"),
    PENDING("pending"),
    IN_REVIEW("in_review"),
    APPROVED("approved"),
    REJECTED("rejected"),
    CANCELLED("cancelled"),
    CHANGES_REQUESTED("changes_requested");

    private final String value;

    ApprovalRequestStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static ApprovalRequestStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (ApprovalRequestStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid status");
    }
}
