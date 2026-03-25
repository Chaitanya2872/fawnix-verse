package com.hirepath.recruitment.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum RequestStatus {
    DRAFT("draft"),
    PENDING("pending"),
    APPROVED("approved"),
    REJECTED("rejected");

    private final String value;

    RequestStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static RequestStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (RequestStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid status");
    }
}
