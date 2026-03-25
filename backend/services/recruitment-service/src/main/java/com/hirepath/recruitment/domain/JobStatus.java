package com.hirepath.recruitment.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum JobStatus {
    OPEN("open"),
    PAUSED("paused"),
    CLOSED("closed"),
    ARCHIVED("archived");

    private final String value;

    JobStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static JobStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (JobStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid status");
    }
}
