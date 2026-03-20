package com.fawnix.crm.leads.service;

import com.fawnix.crm.common.exception.BadRequestException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class IdentityUserClient {

  private final RestTemplate restTemplate;
  private final String identityBaseUrl;
  private final String internalServiceSecret;

  public IdentityUserClient(
      RestTemplate restTemplate,
      @Value("${app.identity.base-url}") String identityBaseUrl,
      @Value("${app.identity.internal-service-secret}") String internalServiceSecret
  ) {
    this.restTemplate = restTemplate;
    this.identityBaseUrl = identityBaseUrl;
    this.internalServiceSecret = internalServiceSecret;
  }

  public IdentityUser getAssignableUserById(String userId) {
    return get(identityBaseUrl + "/internal/users/{id}", IdentityUser.class, userId);
  }

  public IdentityUser getAssignableUserByName(String name) {
    return get(identityBaseUrl + "/internal/users/lookup?name={name}", IdentityUser.class, name);
  }

  public IdentityUser getDefaultAssignee() {
    try {
      ResponseEntity<List<AssigneeRecord>> response = restTemplate.exchange(
          identityBaseUrl + "/internal/users/assignees",
          HttpMethod.GET,
          new HttpEntity<>(headers()),
          new ParameterizedTypeReference<>() {
          }
      );
      List<AssigneeRecord> assignees = response.getBody();
      if (assignees == null || assignees.isEmpty()) {
        return null;
      }
      AssigneeRecord assignee = assignees.get(0);
      return new IdentityUser(
          assignee.id(),
          assignee.name(),
          assignee.email(),
          assignee.phoneNumber(),
          true,
          List.of()
      );
    } catch (RestClientException exception) {
      throw new BadRequestException("Unable to load assignees from identity service.");
    }
  }

  private <T> T get(String url, Class<T> responseType, Object uriVariable) {
    try {
      ResponseEntity<T> response = restTemplate.exchange(
          url,
          HttpMethod.GET,
          new HttpEntity<>(headers()),
          responseType,
          uriVariable
      );
      T body = response.getBody();
      if (body == null) {
        throw new BadRequestException("Identity service returned an empty response.");
      }
      return body;
    } catch (RestClientException exception) {
      throw new BadRequestException("Assignee not found.");
    }
  }

  private HttpHeaders headers() {
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Internal-Service-Secret", internalServiceSecret);
    return headers;
  }

  public record IdentityUser(
      String id,
      String name,
      String email,
      String phoneNumber,
      boolean active,
      List<String> roles
  ) {
  }

  private record AssigneeRecord(String id, String name, String email, String phoneNumber) {
  }
}
