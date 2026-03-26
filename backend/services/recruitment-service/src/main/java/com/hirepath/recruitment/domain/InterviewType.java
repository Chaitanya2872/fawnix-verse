package com.hirepath.recruitment.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum InterviewType {
    TECHNICAL("technical"),
    HR("hr"),
    MANAGERIAL("managerial"),
    FINAL("final"),
    CULTURAL_FIT("cultural_fit");

    private final String value;

    InterviewType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static InterviewType fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (InterviewType type : values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Invalid interview type");
    }
}
