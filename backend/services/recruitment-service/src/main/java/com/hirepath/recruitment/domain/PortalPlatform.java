package com.hirepath.recruitment.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PortalPlatform {
    LINKEDIN("linkedin"),
    NAUKRI("naukri"),
    INDEED("indeed");

    private final String value;

    PortalPlatform(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static PortalPlatform fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (PortalPlatform platform : values()) {
            if (platform.value.equalsIgnoreCase(value)) {
                return platform;
            }
        }
        throw new IllegalArgumentException("Invalid platform: " + value);
    }
}
