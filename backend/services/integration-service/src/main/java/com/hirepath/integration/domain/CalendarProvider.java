package com.hirepath.integration.domain;

public enum CalendarProvider {
    GOOGLE("google"),
    MICROSOFT("microsoft");

    private final String value;

    CalendarProvider(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static CalendarProvider fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Provider is required");
        }
        String normalized = raw.trim().toLowerCase();
        for (CalendarProvider provider : values()) {
            if (provider.value.equals(normalized)) {
                return provider;
            }
        }
        throw new IllegalArgumentException("Unsupported provider");
    }
}
