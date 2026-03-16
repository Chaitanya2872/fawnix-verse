package com.fawnix.crm.contact.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fawnix.crm.common.exception.BadRequestException;
import com.fawnix.crm.contact.config.SpeechToTextProperties;
import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class SpeechToTextClient {

  private final SpeechToTextProperties properties;
  private final RestTemplate restTemplate;

  public SpeechToTextClient(
      SpeechToTextProperties properties,
      RestTemplateBuilder restTemplateBuilder
  ) {
    this.properties = properties;
    this.restTemplate = restTemplateBuilder
        .setConnectTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
        .setReadTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
        .build();
  }

  public TranscriptionResult transcribe(MultipartFile audioFile) {
    if (!properties.isEnabled() || properties.getUrl().isBlank()) {
      throw new BadRequestException("Speech-to-text service is not configured.");
    }

    try {
      byte[] audioBytes = audioFile.getBytes();
      ByteArrayResource resource = new ByteArrayResource(audioBytes) {
        @Override
        public String getFilename() {
          return audioFile.getOriginalFilename();
        }
      };

      HttpHeaders fileHeaders = new HttpHeaders();
      if (audioFile.getContentType() != null && !audioFile.getContentType().isBlank()) {
        fileHeaders.setContentType(MediaType.parseMediaType(audioFile.getContentType()));
      }

      MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
      body.add(properties.getFileFieldName(), new HttpEntity<>(resource, fileHeaders));
      if (properties.getModel() != null && !properties.getModel().isBlank()) {
        body.add("model", properties.getModel());
      }

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.MULTIPART_FORM_DATA);
      if (properties.getApiKey() != null && !properties.getApiKey().isBlank()) {
        String headerValue = properties.getApiKey();
        if (properties.getApiKeyPrefix() != null && !properties.getApiKeyPrefix().isBlank()) {
          headerValue = properties.getApiKeyPrefix().endsWith(" ")
              ? properties.getApiKeyPrefix() + properties.getApiKey()
              : properties.getApiKeyPrefix() + " " + properties.getApiKey();
        }
        headers.set(properties.getApiKeyHeader(), headerValue);
      }

      ResponseEntity<JsonNode> response = restTemplate.exchange(
          properties.getUrl(),
          HttpMethod.POST,
          new HttpEntity<>(body, headers),
          JsonNode.class
      );

      JsonNode responseBody = response.getBody();
      if (responseBody == null) {
        throw new BadRequestException("Speech-to-text service returned an empty response.");
      }

      String transcript = firstText(
          responseBody,
          "transcript",
          "text",
          "data.transcript",
          "data.text",
          "result.transcript",
          "result.text"
      );
      if (transcript.isBlank()) {
        throw new BadRequestException("Speech-to-text service did not return a transcript.");
      }

      String remarksSummary = firstText(
          responseBody,
          "remarksSummary",
          "remarks_summary",
          "remarks",
          "remarkSummary",
          "summary",
          "data.summary",
          "data.remarksSummary",
          "result.summary"
      );
      if (remarksSummary.isBlank()) {
        remarksSummary = summarizeTranscript(transcript);
      }

      String conversationSummary = firstText(
          responseBody,
          "conversationSummary",
          "conversation_summary",
          "conversationHighlights",
          "conversation",
          "highlights",
          "data.conversationSummary",
          "data.conversationHighlights",
          "data.highlights",
          "result.conversationSummary"
      );
      if (conversationSummary.isBlank()) {
        conversationSummary = buildConversationHighlights(transcript);
      }

      return new TranscriptionResult(transcript, remarksSummary, conversationSummary);
    } catch (IOException exception) {
      throw new BadRequestException("Failed to read the uploaded audio recording.");
    } catch (RestClientResponseException exception) {
      String message = extractErrorMessage(exception.getResponseBodyAsString());
      throw new BadRequestException(message.isBlank()
          ? "Unable to transcribe the uploaded recording."
          : message);
    } catch (RestClientException exception) {
      throw new BadRequestException("Unable to transcribe the uploaded recording.");
    }
  }

  private String extractErrorMessage(String responseBody) {
    if (responseBody == null || responseBody.isBlank()) {
      return "";
    }

    try {
      JsonNode root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(responseBody);
      return firstText(root, "detail", "message", "error", "data.detail");
    } catch (Exception ignored) {
      return "";
    }
  }

  private String firstText(JsonNode root, String... paths) {
    for (String path : paths) {
      JsonNode current = root;
      for (String segment : path.split("\\.")) {
        current = current.path(segment);
        if (current.isMissingNode() || current.isNull()) {
          break;
        }
      }
      if (!current.isMissingNode() && !current.isNull()) {
        if (current.isTextual()) {
          String value = current.asText("").trim();
          if (!value.isBlank()) {
            return value;
          }
        }
        if (current.isArray()) {
          List<String> items = new ArrayList<>();
          for (JsonNode item : current) {
            String value = item.asText("").trim();
            if (!value.isBlank()) {
              items.add(value);
            }
          }
          if (!items.isEmpty()) {
            return String.join("\n", items);
          }
        }
      }
    }
    return "";
  }

  private String summarizeTranscript(String transcript) {
    String normalized = normalizeWhitespace(transcript);
    if (normalized.isBlank()) {
      return "";
    }

    String[] sentences = normalized.split("(?<=[.!?])\\s+");
    StringBuilder builder = new StringBuilder();
    for (String sentence : sentences) {
      if (sentence.isBlank()) {
        continue;
      }
      if (builder.length() > 0) {
        builder.append(' ');
      }
      builder.append(sentence.trim());
      if (builder.length() >= 240) {
        break;
      }
    }
    return builder.toString().trim();
  }

  private String buildConversationHighlights(String transcript) {
    String normalized = normalizeWhitespace(transcript);
    if (normalized.isBlank()) {
      return "";
    }

    if (normalized.length() <= 600) {
      return normalized;
    }
    return normalized.substring(0, 600).trim() + "...";
  }

  private String normalizeWhitespace(String value) {
    return value == null ? "" : value.replaceAll("\\s+", " ").trim();
  }

  public record TranscriptionResult(
      String transcript,
      String remarksSummary,
      String conversationSummary
  ) {
  }
}
