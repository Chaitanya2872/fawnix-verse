package com.hirepath.integration.service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CalendarHttpClient {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public CalendarHttpClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().build();
    }

    public Map<String, Object> postForm(String url, Map<String, String> params) {
        String body = encodeForm(params);
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        return executeJson(request);
    }

    public Map<String, Object> getJson(String url, String bearerToken) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Accept", "application/json")
            .header("Authorization", "Bearer " + bearerToken)
            .GET()
            .build();
        return executeJson(request);
    }

    public Map<String, Object> postJson(String url, Object payload, String bearerToken) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .header("Authorization", "Bearer " + bearerToken)
            .POST(jsonBody(payload))
            .build();
        return executeJson(request);
    }

    public Map<String, Object> patchJson(String url, Object payload, String bearerToken) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .header("Authorization", "Bearer " + bearerToken)
            .method("PATCH", jsonBody(payload))
            .build();
        return executeJson(request);
    }

    public void delete(String url, String bearerToken) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Authorization", "Bearer " + bearerToken)
            .DELETE()
            .build();
        executeJson(request);
    }

    private HttpRequest.BodyPublisher jsonBody(Object payload) {
        try {
            return HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload));
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize request");
        }
    }

    private String encodeForm(Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() == null) {
                continue;
            }
            if (!sb.isEmpty()) {
                sb.append('&');
            }
            sb.append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8));
            sb.append('=');
            sb.append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    private Map<String, Object> executeJson(HttpRequest request) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            String body = response.body();
            if (status >= 400) {
                throw new ResponseStatusException(HttpStatus.valueOf(status), body != null && !body.isBlank() ? body : "Provider error");
            }
            if (body == null || body.isBlank()) {
                return new LinkedHashMap<>();
            }
            return objectMapper.readValue(body, new TypeReference<Map<String, Object>>() {});
        } catch (IOException | InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to call provider");
        }
    }
}
