package com.hirepath.integration.service;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import com.hirepath.integration.config.CalendarOAuthProperties;
import com.hirepath.integration.domain.CalendarConnection;
import com.hirepath.integration.domain.CalendarProvider;
import com.hirepath.integration.repository.CalendarConnectionRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CalendarTokenService {

    private final CalendarOAuthProperties properties;
    private final CalendarConnectionRepository connectionRepository;
    private final CalendarHttpClient httpClient;

    public CalendarTokenService(
        CalendarOAuthProperties properties,
        CalendarConnectionRepository connectionRepository,
        CalendarHttpClient httpClient
    ) {
        this.properties = properties;
        this.connectionRepository = connectionRepository;
        this.httpClient = httpClient;
    }

    public CalendarConnection requireConnection(CalendarProvider provider, String userId) {
        return connectionRepository.findByProviderAndUserId(provider, userId)
            .filter(CalendarConnection::isActive)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.PRECONDITION_FAILED, "Calendar not connected"));
    }

    public String getValidAccessToken(CalendarProvider provider, String userId) {
        CalendarConnection connection = requireConnection(provider, userId);
        if (connection.getExpiresAt() != null && connection.getExpiresAt().isBefore(OffsetDateTime.now().plusMinutes(2))) {
            refreshToken(provider, connection);
        }
        return connection.getAccessToken();
    }

    private void refreshToken(CalendarProvider provider, CalendarConnection connection) {
        CalendarOAuthProperties.Provider cfg = getProviderConfig(provider);
        if (cfg.getClientId() == null || cfg.getClientSecret() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Calendar client credentials not configured");
        }
        if (connection.getRefreshToken() == null || connection.getRefreshToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.PRECONDITION_FAILED, "Calendar refresh token missing");
        }
        String tokenUrl = provider == CalendarProvider.GOOGLE
            ? "https://oauth2.googleapis.com/token"
            : "https://login.microsoftonline.com/common/oauth2/v2.0/token";

        Map<String, String> params = new LinkedHashMap<>();
        params.put("client_id", cfg.getClientId());
        params.put("client_secret", cfg.getClientSecret());
        params.put("refresh_token", connection.getRefreshToken());
        params.put("grant_type", "refresh_token");
        if (provider == CalendarProvider.MICROSOFT) {
            params.put("scope", defaultScopes(provider, cfg));
        }

        Map<String, Object> response = httpClient.postForm(tokenUrl, params);
        String accessToken = valueAsString(response.get("access_token"));
        String refreshToken = valueAsString(response.get("refresh_token"));
        Integer expiresIn = valueAsInteger(response.get("expires_in"));
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to refresh calendar token");
        }
        connection.setAccessToken(accessToken);
        if (refreshToken != null && !refreshToken.isBlank()) {
            connection.setRefreshToken(refreshToken);
        }
        if (expiresIn != null) {
            connection.setExpiresAt(OffsetDateTime.now().plusSeconds(expiresIn));
        }
        connectionRepository.save(connection);
    }

    private CalendarOAuthProperties.Provider getProviderConfig(CalendarProvider provider) {
        return provider == CalendarProvider.GOOGLE ? properties.getGoogle() : properties.getMicrosoft();
    }

    private String defaultScopes(CalendarProvider provider, CalendarOAuthProperties.Provider cfg) {
        if (cfg.getScopes() != null && !cfg.getScopes().isBlank()) {
            return cfg.getScopes();
        }
        if (provider == CalendarProvider.GOOGLE) {
            return "openid email profile https://www.googleapis.com/auth/calendar.events";
        }
        return "offline_access User.Read Calendars.ReadWrite OnlineMeetings.ReadWrite";
    }

    private String valueAsString(Object value) {
        return value != null ? value.toString() : null;
    }

    private Integer valueAsInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value != null) {
            try {
                return Integer.parseInt(value.toString());
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }
}
