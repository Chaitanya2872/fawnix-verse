package com.fawnix.crm.integrations.meta;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class MetaLeadClient {

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;
  private final MetaLeadProperties properties;

  public MetaLeadClient(
      RestTemplate restTemplate,
      ObjectMapper objectMapper,
      MetaLeadProperties properties
  ) {
    this.restTemplate = restTemplate;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  public MetaLeadDetails fetchLead(String leadgenId) {
    String accessToken = properties.accessToken();
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

      Instant createdTime = null;
      String createdRaw = root.path("created_time").asText(null);
      if (createdRaw != null && !createdRaw.isBlank()) {
        createdTime = Instant.parse(createdRaw);
      }

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

  public record MetaLeadDetails(
      String leadgenId,
      Instant createdTime,
      Map<String, List<String>> fieldData,
      String adId,
      String formId,
      String rawPayload
  ) {
  }
}
