package com.fawnix.identity.auth.service;

import com.fawnix.identity.auth.dto.FawnixOtpDtos;
import com.fawnix.identity.common.exception.BadRequestException;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

@Service
public class FawnixOtpClient {

  private final RestTemplate restTemplate;
  private final String baseUrl;

  public FawnixOtpClient(
      RestTemplateBuilder restTemplateBuilder,
      @Value("${app.fawnix-otp.base-url:https://fawnix.acstechnologies.co.in/api}") String baseUrl,
      @Value("${app.fawnix-otp.timeout-seconds:10}") long timeoutSeconds
  ) {
    this.restTemplate = restTemplateBuilder
        .setConnectTimeout(Duration.ofSeconds(timeoutSeconds))
        .setReadTimeout(Duration.ofSeconds(timeoutSeconds))
        .build();
    this.baseUrl = baseUrl;
  }

  public FawnixOtpDtos.RequestOtpResponse requestOtp(String empCode) {
    try {
      FawnixOtpDtos.RequestOtpRequest request = new FawnixOtpDtos.RequestOtpRequest(empCode);
      FawnixOtpDtos.RequestOtpResponse response = restTemplate.postForObject(
          baseUrl + "/auth/request-otp",
          request,
          FawnixOtpDtos.RequestOtpResponse.class
      );
      if (response == null) {
        throw new BadRequestException("Unable to request OTP.");
      }
      return response;
    } catch (HttpStatusCodeException exception) {
      throw new BadRequestException(resolveUpstreamMessage(exception, "Unable to request OTP."));
    } catch (ResourceAccessException exception) {
      throw new BadRequestException("Fawnix OTP service is unavailable right now.");
    }
  }

  public FawnixOtpDtos.VerifyOtpResponse verifyOtp(String empCode, String otp) {
    try {
      FawnixOtpDtos.VerifyOtpRequest request = new FawnixOtpDtos.VerifyOtpRequest(empCode, otp);
      FawnixOtpDtos.VerifyOtpResponse response = restTemplate.postForObject(
          baseUrl + "/auth/verify-otp",
          request,
          FawnixOtpDtos.VerifyOtpResponse.class
      );
      if (response == null) {
        throw new BadRequestException("Unable to verify OTP.");
      }
      return response;
    } catch (HttpStatusCodeException exception) {
      throw new BadRequestException(resolveUpstreamMessage(exception, "Unable to verify OTP."));
    } catch (ResourceAccessException exception) {
      throw new BadRequestException("Fawnix OTP service is unavailable right now.");
    }
  }

  public FawnixOtpDtos.FawnixMeResponse fetchProfile(String accessToken) {
    try {
      HttpHeaders headers = new HttpHeaders();
      headers.setBearerAuth(accessToken);
      HttpEntity<Void> entity = new HttpEntity<>(headers);
      ResponseEntity<FawnixOtpDtos.FawnixMeResponse> response = restTemplate.exchange(
          baseUrl + "/auth/me",
          HttpMethod.GET,
          entity,
          FawnixOtpDtos.FawnixMeResponse.class
      );
      if (response.getBody() == null) {
        throw new BadRequestException("Unable to fetch profile.");
      }
      return response.getBody();
    } catch (HttpStatusCodeException exception) {
      throw new BadRequestException(resolveUpstreamMessage(exception, "Unable to fetch profile."));
    } catch (ResourceAccessException exception) {
      throw new BadRequestException("Fawnix OTP service is unavailable right now.");
    }
  }

  private String resolveUpstreamMessage(HttpStatusCodeException exception, String fallbackMessage) {
    String responseBody = exception.getResponseBodyAsString();
    if (responseBody == null) {
      return fallbackMessage;
    }
    String sanitized = responseBody.trim();
    if (sanitized.isEmpty()) {
      return fallbackMessage;
    }
    return sanitized.length() > 240 ? sanitized.substring(0, 240) : sanitized;
  }
}
