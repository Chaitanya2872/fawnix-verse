package com.hirepath.approval.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ApprovalActionType {
    CREATED("created"),
    APPROVED("approved"),
    REJECTED("rejected"),
    CHANGES_REQUESTED("changes_requested"),
    CANCELLED("cancelled"),
    RESUBMITTED("resubmitted");

    private final String value;

    ApprovalActionType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
