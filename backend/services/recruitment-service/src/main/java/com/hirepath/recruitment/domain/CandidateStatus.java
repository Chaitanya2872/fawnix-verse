package com.hirepath.recruitment.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum CandidateStatus {
    APPLIED("applied"),
    SHORTLISTED("shortlisted"),
    HR_SCREENING("hr_screening"),
    INTERVIEW_SCHEDULED("interview_scheduled"),
    INTERVIEW_COMPLETED("interview_completed"),
    SELECTED("selected"),
    REJECTED("rejected"),
    OFFER_SENT("offer_sent"),
    OFFER_ACCEPTED("offer_accepted"),
    OFFER_DECLINED("offer_declined"),
    HIRED("hired"),
    TALENT_POOL("talent_pool");

    private final String value;

    CandidateStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static CandidateStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (CandidateStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid status");
    }
}
