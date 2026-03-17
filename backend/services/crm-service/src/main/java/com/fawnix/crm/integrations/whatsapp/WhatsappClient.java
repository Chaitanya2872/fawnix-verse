package com.fawnix.crm.integrations.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Service
public class WhatsappClient {

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;
  private final WhatsappProperties properties;
  private final WhatsappIntegrationSettingsService settingsService;

  public WhatsappClient(
      RestTemplate restTemplate,
      ObjectMapper objectMapper,
      WhatsappProperties properties,
      WhatsappIntegrationSettingsService settingsService
  ) {
    this.restTemplate = restTemplate;
    this.objectMapper = objectMapper;
    this.properties = properties;
    this.settingsService = settingsService;
  }

  public String sendTemplate(String to, String templateName, String languageCode, List<String> bodyParams) {
    Map<String, Object> template = new HashMap<>();
    template.put("name", templateName);
    template.put("language", Map.of("code", languageCode));

    if (bodyParams != null && !bodyParams.isEmpty()) {
      template.put("components", List.of(Map.of(
          "type", "body",
          "parameters", bodyParams.stream()
              .map(param -> Map.of("type", "text", "text", param))
              .toList()
      )));
    }

    Map<String, Object> payload = new HashMap<>();
    payload.put("messaging_product", "whatsapp");
    payload.put("to", to);
    payload.put("type", "template");
    payload.put("template", template);

    return postMessage(payload);
  }

  public String sendText(String to, String text) {
    Map<String, Object> payload = new HashMap<>();
    payload.put("messaging_product", "whatsapp");
    payload.put("to", to);
    payload.put("type", "text");
    payload.put("text", Map.of("body", text));
    return postMessage(payload);
  }

  public String sendButtons(String to, String text, List<ButtonOption> buttons) {
    Map<String, Object> payload = new HashMap<>();
    payload.put("messaging_product", "whatsapp");
    payload.put("to", to);
    payload.put("type", "interactive");
    payload.put("interactive", Map.of(
        "type", "button",
        "body", Map.of("text", text),
        "action", Map.of(
            "buttons", buttons.stream()
                .map(button -> Map.of(
                    "type", "reply",
                    "reply", Map.of("id", button.id(), "title", button.title())
                ))
                .toList()
        )
    ));
    return postMessage(payload);
  }

  public String sendList(String to, String text, String buttonText, List<ListOption> options) {
    Map<String, Object> payload = new HashMap<>();
    payload.put("messaging_product", "whatsapp");
    payload.put("to", to);
    payload.put("type", "interactive");
    payload.put("interactive", Map.of(
        "type", "list",
        "body", Map.of("text", text),
        "action", Map.of(
            "button", buttonText,
            "sections", List.of(Map.of(
                "title", "Options",
                "rows", options.stream()
                    .map(option -> {
                      Map<String, Object> row = new HashMap<>();
                      row.put("id", option.id());
                      row.put("title", option.title());
                      if (StringUtils.hasText(option.description())) {
                        row.put("description", option.description());
                      }
                      return row;
                    })
                    .toList()
            ))
        )
    ));
    return postMessage(payload);
  }

  private String postMessage(Map<String, Object> payload) {
    String accessToken = settingsService.resolveAccessToken();
    String phoneNumberId = settingsService.resolvePhoneNumberId();
    if (!StringUtils.hasText(accessToken) || !StringUtils.hasText(phoneNumberId)) {
      throw new IllegalStateException("WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required.");
    }

    String version = StringUtils.hasText(properties.apiVersion()) ? properties.apiVersion().trim() : "v19.0";
    String url = "https://graph.facebook.com/" + version + "/" + phoneNumberId + "/messages";

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.setBearerAuth(accessToken);

    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
    ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

    String body = response.getBody();
    if (!StringUtils.hasText(body)) {
      return null;
    }

    try {
      JsonNode root = objectMapper.readTree(body);
      JsonNode messages = root.path("messages");
      if (messages.isArray() && messages.size() > 0) {
        return messages.get(0).path("id").asText(null);
      }
    } catch (Exception ignored) {
    }

    return null;
  }

  public record ButtonOption(String id, String title) {
  }

  public record ListOption(String id, String title, String description) {
  }
}
