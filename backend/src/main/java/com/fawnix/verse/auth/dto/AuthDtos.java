package com.fawnix.verse.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
      List<String> roles
  ) {
  }
}
