package com.fawnix.identity.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class AuthDtos {

  private AuthDtos() {
  }

  public record LoginRequest(
      @NotBlank @Email String email,
      @NotBlank String password
  ) {
  }

  public record RegisterRequest(
      @NotBlank @Size(max = 120) String fullName,
      @NotBlank @Email @Size(max = 160) String email,
      @Size(max = 40) String phoneNumber,
      @Size(max = 40) String language,
      @NotBlank @Size(min = 8, max = 72) String password
  ) {
  }

  public record RefreshTokenRequest(
      @NotBlank String refreshToken
  ) {
  }

  public record LogoutRequest(
      @NotBlank String refreshToken
  ) {
  }

  public record TokenResponse(
      String accessToken,
      String refreshToken,
      Instant accessTokenExpiresAt,
      Instant refreshTokenExpiresAt,
      CurrentUserResponse user
  ) {
  }

  public record CurrentUserResponse(
      String id,
      String name,
      String email,
      List<String> roles,
      List<String> permissions
  ) {
  }
}
