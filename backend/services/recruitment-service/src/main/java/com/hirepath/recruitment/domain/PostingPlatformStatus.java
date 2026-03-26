package com.hirepath.recruitment.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PostingPlatformStatus {
    PENDING("pending"),
    PUBLISHED("published"),
    FAILED("failed");

    private final String value;

    PostingPlatformStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static PostingPlatformStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (PostingPlatformStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid status");
    }
}
