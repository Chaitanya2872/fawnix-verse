package com.hirepath.recruitment.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PostingStatus {
    DRAFT("draft"),
    PUBLISHING("publishing"),
    PUBLISHED("published"),
    FAILED("failed"),
    CLOSED("closed");

    private final String value;

    PostingStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static PostingStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (PostingStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid status");
    }
}
