package com.hirepath.integration.dto;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class CalendarConnectionResponse {
    private String provider;
    private String accountEmail;
    private boolean connected;
    private OffsetDateTime expiresAt;

    public CalendarConnectionResponse() {}

    public CalendarConnectionResponse(String provider, String accountEmail, boolean connected, OffsetDateTime expiresAt) {
        this.provider = provider;
        this.accountEmail = accountEmail;
        this.connected = connected;
        this.expiresAt = expiresAt;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getAccountEmail() {
        return accountEmail;
    }

    public void setAccountEmail(String accountEmail) {
        this.accountEmail = accountEmail;
    }

    public boolean isConnected() {
        return connected;
    }

    public void setConnected(boolean connected) {
        this.connected = connected;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
}
