package com.hirepath.integration.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class CalendarAuthorizationResponse {
    private String authorizationUrl;

    public CalendarAuthorizationResponse() {}

    public CalendarAuthorizationResponse(String authorizationUrl) {
        this.authorizationUrl = authorizationUrl;
    }

    public String getAuthorizationUrl() {
        return authorizationUrl;
    }

    public void setAuthorizationUrl(String authorizationUrl) {
        this.authorizationUrl = authorizationUrl;
    }
}
