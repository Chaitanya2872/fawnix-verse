package com.hirepath.integration.dto;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PortalCredentialResponse {
    private String platform;
    private String clientId;
    private String accountName;
    private boolean isActive;
    private OffsetDateTime expiresAt;
    private boolean hasClientSecret;
    private boolean hasAccessToken;
    private boolean hasRefreshToken;

    public PortalCredentialResponse() {}

    public PortalCredentialResponse(
        String platform,
        String clientId,
        String accountName,
        boolean isActive,
        OffsetDateTime expiresAt,
        boolean hasClientSecret,
        boolean hasAccessToken,
        boolean hasRefreshToken
    ) {
        this.platform = platform;
        this.clientId = clientId;
        this.accountName = accountName;
        this.isActive = isActive;
        this.expiresAt = expiresAt;
        this.hasClientSecret = hasClientSecret;
        this.hasAccessToken = hasAccessToken;
        this.hasRefreshToken = hasRefreshToken;
    }

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getAccountName() {
        return accountName;
    }

    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public boolean isHasClientSecret() {
        return hasClientSecret;
    }

    public void setHasClientSecret(boolean hasClientSecret) {
        this.hasClientSecret = hasClientSecret;
    }

    public boolean isHasAccessToken() {
        return hasAccessToken;
    }

    public void setHasAccessToken(boolean hasAccessToken) {
        this.hasAccessToken = hasAccessToken;
    }

    public boolean isHasRefreshToken() {
        return hasRefreshToken;
    }

    public void setHasRefreshToken(boolean hasRefreshToken) {
        this.hasRefreshToken = hasRefreshToken;
    }
}
