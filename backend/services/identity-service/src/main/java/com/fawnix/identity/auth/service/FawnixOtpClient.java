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
  }

  public FawnixOtpDtos.VerifyOtpResponse verifyOtp(String empCode, String otp) {
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
  }

  public FawnixOtpDtos.FawnixMeResponse fetchProfile(String accessToken) {
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
  }
}
