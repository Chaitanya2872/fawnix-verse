package com.hirepath.approval.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum AssigneeType {
    ROLE("role"),
    USER("user");

    private final String value;

    AssigneeType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
