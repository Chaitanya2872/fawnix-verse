package com.fawnix.crm.integrations.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Service
public class WhatsappIntegrationTestService {

  private final WhatsappIntegrationSettingsService settingsService;
  private final WhatsappProperties properties;
  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;

  public WhatsappIntegrationTestService(
      WhatsappIntegrationSettingsService settingsService,
      WhatsappProperties properties,
      RestTemplate restTemplate,
      ObjectMapper objectMapper
  ) {
    this.settingsService = settingsService;
    this.properties = properties;
    this.restTemplate = restTemplate;
    this.objectMapper = objectMapper;
  }

  public WhatsappIntegrationSettingsController.WhatsappIntegrationTestResponse testConnection() {
    String accessToken = settingsService.resolveAccessToken();
    String phoneNumberId = settingsService.resolvePhoneNumberId();
    if (!StringUtils.hasText(accessToken) || !StringUtils.hasText(phoneNumberId)) {
      return new WhatsappIntegrationSettingsController.WhatsappIntegrationTestResponse(
          false,
          "Access token or phone number ID is missing.",
          null,
          null,
          null
      );
    }

    String version = StringUtils.hasText(properties.apiVersion()) ? properties.apiVersion().trim() : "v19.0";
    String url = "https://graph.facebook.com/" + version + "/" + phoneNumberId
        + "?fields=display_phone_number,verified_name&access_token=" + accessToken;

    try {
      String body = restTemplate.getForObject(url, String.class);
      JsonNode node = body != null ? objectMapper.readTree(body) : null;
      String displayNumber = node != null ? node.path("display_phone_number").asText(null) : null;
      String verifiedName = node != null ? node.path("verified_name").asText(null) : null;

      return new WhatsappIntegrationSettingsController.WhatsappIntegrationTestResponse(
          true,
          "Connection successful.",
          phoneNumberId,
          displayNumber,
          verifiedName
      );
    } catch (Exception ex) {
      return new WhatsappIntegrationSettingsController.WhatsappIntegrationTestResponse(
          false,
          "Connection failed: " + ex.getMessage(),
          null,
          null,
          null
      );
    }
  }
}
