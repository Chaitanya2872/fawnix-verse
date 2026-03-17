package com.fawnix.crm.integrations.meta;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Service
public class MetaIntegrationTestService {

  private final MetaIntegrationSettingsService settingsService;
  private final MetaLeadProperties properties;
  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;

  public MetaIntegrationTestService(
      MetaIntegrationSettingsService settingsService,
      MetaLeadProperties properties,
      RestTemplate restTemplate,
      ObjectMapper objectMapper
  ) {
    this.settingsService = settingsService;
    this.properties = properties;
    this.restTemplate = restTemplate;
    this.objectMapper = objectMapper;
  }

  public MetaIntegrationSettingsController.MetaIntegrationTestResponse testConnection() {
    String accessToken = settingsService.resolveAccessToken();
    if (!StringUtils.hasText(accessToken)) {
      return new MetaIntegrationSettingsController.MetaIntegrationTestResponse(
          false,
          "Access token is missing.",
          null,
          null,
          null,
          null
      );
    }

    String version = StringUtils.hasText(properties.apiVersion()) ? properties.apiVersion().trim() : "v19.0";
    String meUrl = "https://graph.facebook.com/" + version + "/me?fields=id,name&access_token=" + accessToken;

    try {
      String meBody = restTemplate.getForObject(meUrl, String.class);
      JsonNode meNode = meBody != null ? objectMapper.readTree(meBody) : null;
      String pageId = meNode != null ? meNode.path("id").asText(null) : null;
      String pageName = meNode != null ? meNode.path("name").asText(null) : null;

      String formId = settingsService.resolveFormId();
      String formName = null;
      if (StringUtils.hasText(formId)) {
        String formUrl = "https://graph.facebook.com/" + version + "/" + formId
            + "?fields=id,name&access_token=" + accessToken;
        String formBody = restTemplate.getForObject(formUrl, String.class);
        JsonNode formNode = formBody != null ? objectMapper.readTree(formBody) : null;
        formName = formNode != null ? formNode.path("name").asText(null) : null;
      }

      return new MetaIntegrationSettingsController.MetaIntegrationTestResponse(
          true,
          "Connection successful.",
          pageId,
          pageName,
          formId,
          formName
      );
    } catch (Exception ex) {
      return new MetaIntegrationSettingsController.MetaIntegrationTestResponse(
          false,
          "Connection failed: " + ex.getMessage(),
          null,
          null,
          null,
          null
      );
    }
  }
}
