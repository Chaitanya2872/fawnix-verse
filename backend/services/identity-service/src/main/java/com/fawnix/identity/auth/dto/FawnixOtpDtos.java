package com.fawnix.identity.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public final class FawnixOtpDtos {

  private FawnixOtpDtos() {
  }

  public record RequestOtpRequest(
      @JsonProperty("emp_code")
      @NotBlank
      String empCode
  ) {
  }

  public record RequestOtpResponse(
      @JsonProperty("expires_in_minutes")
      Integer expiresInMinutes,
      String message,
      Boolean success
  ) {
  }

  public record VerifyOtpRequest(
      @JsonProperty("emp_code")
      @NotBlank
      String empCode,
      @NotBlank
      String otp
  ) {
  }

  public record VerifyOtpResponse(
      @JsonProperty("access_token")
      String accessToken,
      @JsonProperty("refresh_token")
      String refreshToken,
      @JsonProperty("expires_in")
      Integer expiresIn,
      @JsonProperty("refresh_expires_in")
      Integer refreshExpiresIn,
      @JsonProperty("refresh_expires_at")
      String refreshExpiresAt,
      @JsonProperty("token_type")
      String tokenType,
      Boolean success,
      FawnixUser user
  ) {
  }

  public record FawnixMeResponse(
      FawnixUser data,
      Boolean success
  ) {
  }

  public record FawnixUser(
      @JsonProperty("emp_code")
      String empCode,
      @JsonProperty("emp_email")
      String empEmail,
      @JsonProperty("emp_full_name")
      String empFullName,
      @JsonProperty("emp_contact")
      String empContact,
      @JsonProperty("emp_designation")
      String empDesignation,
      String role,
      @JsonProperty("user_id")
      Integer userId,
      Integer id
  ) {
  }
}
