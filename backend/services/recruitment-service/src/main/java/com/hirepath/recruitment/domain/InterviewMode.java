package com.hirepath.recruitment.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum InterviewMode {
    ONLINE("online"),
    OFFLINE("offline");

    private final String value;

    InterviewMode(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static InterviewMode fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (InterviewMode mode : values()) {
            if (mode.value.equalsIgnoreCase(value)) {
                return mode;
            }
        }
        throw new IllegalArgumentException("Invalid interview mode");
    }
}
