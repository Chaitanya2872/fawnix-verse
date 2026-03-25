package com.fawnix.identity.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class UserDtos {

  private UserDtos() {
  }

  public record UserResponse(
      String id,
      String name,
      String email,
      String phoneNumber,
      String language,
      boolean active,
      List<String> roles,
      List<String> permissions,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record CreateUserRequest(
      @NotBlank @Size(max = 120) String fullName,
      @NotBlank @Email @Size(max = 160) String email,
      @NotBlank @Size(max = 40) String phoneNumber,
      @Size(max = 40) String language,
      @NotBlank @Size(min = 8, max = 72) String password,
      @NotBlank String role,
      List<String> permissions
  ) {
  }

  public record UpdateUserRequest(
      @NotBlank @Size(max = 120) String fullName,
      @NotBlank @Email @Size(max = 160) String email,
      @NotBlank @Size(max = 40) String phoneNumber,
      @Size(max = 40) String language,
      @Size(min = 8, max = 72) String password,
      @NotBlank String role,
      List<String> permissions
  ) {
  }

  public record UpdateUserStatusRequest(
      boolean active
  ) {
  }

  public record UpdateUserRoleRequest(
      @NotBlank String role
  ) {
  }
}
