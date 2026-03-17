package com.fawnix.crm.integrations.meta;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class MetaLeadClient {

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;
  private final MetaLeadProperties properties;
  private final MetaIntegrationSettingsService settingsService;

  public MetaLeadClient(
      @Qualifier("externalRestTemplate") RestTemplate restTemplate,
      ObjectMapper objectMapper,
      MetaLeadProperties properties,
      MetaIntegrationSettingsService settingsService
  ) {
    this.restTemplate = restTemplate;
    this.objectMapper = objectMapper;
    this.properties = properties;
    this.settingsService = settingsService;
  }

  public MetaLeadDetails fetchLead(String leadgenId) {
    String accessToken = settingsService.resolveAccessToken();
    if (accessToken == null || accessToken.isBlank()) {
      throw new IllegalStateException("META_ACCESS_TOKEN is required to fetch lead details.");
    }

    String version = properties.apiVersion() == null || properties.apiVersion().isBlank()
        ? "v19.0"
        : properties.apiVersion().trim();
    String url = "https://graph.facebook.com/" + version + "/" + leadgenId
        + "?access_token=" + accessToken
        + "&fields=created_time,field_data,ad_id,form_id";

    ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
    String body = response.getBody();
    if (body == null || body.isBlank()) {
      throw new IllegalStateException("Meta lead response was empty.");
    }

    try {
      JsonNode root = objectMapper.readTree(body);
      Map<String, List<String>> fieldData = new HashMap<>();
      for (JsonNode field : root.path("field_data")) {
        String name = field.path("name").asText(null);
        if (name == null) {
          continue;
        }
        List<String> values = new ArrayList<>();
        for (JsonNode valueNode : field.path("values")) {
          String value = valueNode.asText(null);
          if (value != null) {
            values.add(value);
          }
        }
        fieldData.put(name, values);
      }

      Instant createdTime = parseCreatedTime(root.path("created_time").asText(null));

      return new MetaLeadDetails(
          leadgenId,
          createdTime,
          fieldData,
          root.path("ad_id").asText(null),
          root.path("form_id").asText(null),
          body
      );
    } catch (IOException ex) {
      throw new IllegalStateException("Failed to parse Meta lead response.", ex);
    }
  }

  public MetaLeadPage fetchFormLeads(String formId, String afterCursor, int limit) {
    String accessToken = settingsService.resolveAccessToken();
    if (accessToken == null || accessToken.isBlank()) {
      throw new IllegalStateException("META_ACCESS_TOKEN is required to fetch lead details.");
    }
    if (formId == null || formId.isBlank()) {
      throw new IllegalStateException("META_FORM_ID is required to fetch form leads.");
    }

    int resolvedLimit = limit > 0 ? limit : 25;
    String version = properties.apiVersion() == null || properties.apiVersion().isBlank()
        ? "v19.0"
        : properties.apiVersion().trim();
    String url = "https://graph.facebook.com/" + version + "/" + formId
        + "/leads?access_token=" + accessToken
        + "&fields=created_time,field_data,ad_id,form_id"
        + "&limit=" + resolvedLimit;
    if (afterCursor != null && !afterCursor.isBlank()) {
      url += "&after=" + afterCursor;
    }

    ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
    String body = response.getBody();
    if (body == null || body.isBlank()) {
      throw new IllegalStateException("Meta lead response was empty.");
    }

    try {
      JsonNode root = objectMapper.readTree(body);
      List<MetaLeadDetails> leads = new ArrayList<>();
      for (JsonNode leadNode : root.path("data")) {
        String leadgenId = leadNode.path("id").asText(null);
        if (leadgenId == null) {
          continue;
        }
        Map<String, List<String>> fieldData = new HashMap<>();
        for (JsonNode field : leadNode.path("field_data")) {
          String name = field.path("name").asText(null);
          if (name == null) {
            continue;
          }
          List<String> values = new ArrayList<>();
          for (JsonNode valueNode : field.path("values")) {
            String value = valueNode.asText(null);
            if (value != null) {
              values.add(value);
            }
          }
          fieldData.put(name, values);
        }

        Instant createdTime = parseCreatedTime(leadNode.path("created_time").asText(null));
        String rawPayload = objectMapper.writeValueAsString(leadNode);

        leads.add(new MetaLeadDetails(
            leadgenId,
            createdTime,
            fieldData,
            leadNode.path("ad_id").asText(null),
            leadNode.path("form_id").asText(formId),
            rawPayload
        ));
      }

      String nextCursor = root.path("paging").path("cursors").path("after").asText(null);
      return new MetaLeadPage(leads, nextCursor);
    } catch (IOException ex) {
      throw new IllegalStateException("Failed to parse Meta lead response.", ex);
    }
  }

  public record MetaLeadDetails(
      String leadgenId,
      Instant createdTime,
      Map<String, List<String>> fieldData,
      String adId,
      String formId,
      String rawPayload
  ) {
  }

  public record MetaLeadPage(
      List<MetaLeadDetails> leads,
      String nextCursor
  ) {
  }

  private Instant parseCreatedTime(String createdRaw) {
    if (createdRaw == null || createdRaw.isBlank()) {
      return null;
    }
    try {
      return Instant.parse(createdRaw);
    } catch (DateTimeParseException ignored) {
    }
    try {
      DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssZ");
      return OffsetDateTime.parse(createdRaw, formatter).toInstant();
    } catch (DateTimeParseException ignored) {
    }
    return null;
  }
}
