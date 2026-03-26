package com.hirepath.approval.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ApprovalPriority {
    LOW("low"),
    MEDIUM("medium"),
    HIGH("high"),
    URGENT("urgent");

    private final String value;

    ApprovalPriority(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static ApprovalPriority fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (ApprovalPriority priority : values()) {
            if (priority.value.equalsIgnoreCase(value)) {
                return priority;
            }
        }
        throw new IllegalArgumentException("Invalid priority");
    }
}
