package com.hirepath.recruitment.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum OfferStatus {
    DRAFT("draft"),
    PENDING_APPROVAL("pending_approval"),
    APPROVED("approved"),
    SENT("sent"),
    ACCEPTED("accepted"),
    DECLINED("declined"),
    EXPIRED("expired");

    private final String value;

    OfferStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static OfferStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (OfferStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid status");
    }
}
