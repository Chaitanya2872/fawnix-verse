package com.hirepath.integration.service;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.hirepath.integration.config.CalendarOAuthProperties;
import com.hirepath.integration.domain.CalendarConnection;
import com.hirepath.integration.domain.CalendarOAuthState;
import com.hirepath.integration.domain.CalendarProvider;
import com.hirepath.integration.repository.CalendarConnectionRepository;
import com.hirepath.integration.repository.CalendarOAuthStateRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class CalendarOAuthService {

    private final CalendarOAuthProperties properties;
    private final CalendarConnectionRepository connectionRepository;
    private final CalendarOAuthStateRepository stateRepository;
    private final CalendarHttpClient httpClient;

    public CalendarOAuthService(
        CalendarOAuthProperties properties,
        CalendarConnectionRepository connectionRepository,
        CalendarOAuthStateRepository stateRepository,
        CalendarHttpClient httpClient
    ) {
        this.properties = properties;
        this.connectionRepository = connectionRepository;
        this.stateRepository = stateRepository;
        this.httpClient = httpClient;
    }

    public String buildAuthorizationUrl(CalendarProvider provider, String userId, String returnUrl) {
        CalendarOAuthProperties.Provider cfg = getProviderConfig(provider);
        if (cfg.getClientId() == null || cfg.getClientId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Calendar client id not configured");
        }
        if (cfg.getRedirectUri() == null || cfg.getRedirectUri().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Calendar redirect URI not configured");
        }

        String state = UUID.randomUUID().toString().replace("-", "");
        String resolvedReturn = (returnUrl != null && !returnUrl.isBlank())
            ? returnUrl
            : properties.getOauthSuccessRedirect();
        stateRepository.save(new CalendarOAuthState(state, provider, userId, resolvedReturn));

        String scope = defaultScopes(provider, cfg);
        UriComponentsBuilder builder;
        if (provider == CalendarProvider.GOOGLE) {
            builder = UriComponentsBuilder.fromHttpUrl("https://accounts.google.com/o/oauth2/v2/auth")
                .queryParam("client_id", cfg.getClientId())
                .queryParam("redirect_uri", cfg.getRedirectUri())
                .queryParam("response_type", "code")
                .queryParam("access_type", "offline")
                .queryParam("prompt", "consent")
                .queryParam("scope", scope)
                .queryParam("state", state);
        } else {
            builder = UriComponentsBuilder.fromHttpUrl("https://login.microsoftonline.com/common/oauth2/v2.0/authorize")
                .queryParam("client_id", cfg.getClientId())
                .queryParam("redirect_uri", cfg.getRedirectUri())
                .queryParam("response_type", "code")
                .queryParam("response_mode", "query")
                .queryParam("scope", scope)
                .queryParam("state", state);
        }

        return builder.toUriString();
    }

    public String handleCallback(CalendarProvider provider, String code, String state) {
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing code");
        }
        if (state == null || state.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing state");
        }
        CalendarOAuthState stored = stateRepository.findById(state)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid state"));
        stateRepository.delete(stored);

        CalendarOAuthProperties.Provider cfg = getProviderConfig(provider);
        String tokenUrl = provider == CalendarProvider.GOOGLE
            ? "https://oauth2.googleapis.com/token"
            : "https://login.microsoftonline.com/common/oauth2/v2.0/token";

        Map<String, String> params = new LinkedHashMap<>();
        params.put("code", code);
        params.put("client_id", cfg.getClientId());
        params.put("client_secret", cfg.getClientSecret());
        params.put("redirect_uri", cfg.getRedirectUri());
        params.put("grant_type", "authorization_code");
        if (provider == CalendarProvider.MICROSOFT) {
            params.put("scope", defaultScopes(provider, cfg));
        }

        Map<String, Object> tokenResponse = httpClient.postForm(tokenUrl, params);
        String accessToken = valueAsString(tokenResponse.get("access_token"));
        String refreshToken = valueAsString(tokenResponse.get("refresh_token"));
        Integer expiresIn = valueAsInteger(tokenResponse.get("expires_in"));
        String scopes = valueAsString(tokenResponse.get("scope"));
        if (accessToken == null || accessToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to fetch calendar access token");
        }

        String accountEmail = fetchAccountEmail(provider, accessToken);
        CalendarConnection connection = connectionRepository
            .findByProviderAndUserId(provider, stored.getUserId())
            .orElseGet(CalendarConnection::new);

        connection.setUserId(stored.getUserId());
        connection.setProvider(provider);
        connection.setAccessToken(accessToken);
        if (refreshToken != null && !refreshToken.isBlank()) {
            connection.setRefreshToken(refreshToken);
        }
        if (expiresIn != null) {
            connection.setExpiresAt(OffsetDateTime.now().plusSeconds(expiresIn));
        }
        connection.setScopes(scopes != null ? scopes : defaultScopes(provider, cfg));
        connection.setAccountEmail(accountEmail);
        connection.setActive(true);
        connectionRepository.save(connection);

        return stored.getReturnUrl() != null ? stored.getReturnUrl() : properties.getOauthSuccessRedirect();
    }

    private String fetchAccountEmail(CalendarProvider provider, String accessToken) {
        if (provider == CalendarProvider.GOOGLE) {
            Map<String, Object> profile = httpClient.getJson("https://openidconnect.googleapis.com/v1/userinfo", accessToken);
            return valueAsString(profile.get("email"));
        }
        Map<String, Object> profile = httpClient.getJson("https://graph.microsoft.com/v1.0/me", accessToken);
        String mail = valueAsString(profile.get("mail"));
        if (mail != null && !mail.isBlank()) {
            return mail;
        }
        return valueAsString(profile.get("userPrincipalName"));
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
