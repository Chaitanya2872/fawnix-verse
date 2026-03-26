package com.hirepath.recruitment.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum IntakeStatus {
    NEW("new"),
    REVIEWED("reviewed"),
    SHORTLISTED("shortlisted"),
    REJECTED("rejected");

    private final String value;

    IntakeStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static IntakeStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (IntakeStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid status");
    }
}
