package com.fawnix.identity.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class PermissionDtos {

  private PermissionDtos() {
  }

  public record PermissionResponse(
      String key,
      String label,
      String moduleKey,
      String description,
      boolean active,
      boolean systemDefined,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record CreatePermissionRequest(
      @NotBlank @Size(max = 120) String key,
      @NotBlank @Size(max = 160) String label,
      @NotBlank @Size(max = 80) String moduleKey,
      @Size(max = 500) String description
  ) {
  }

  public record UpdatePermissionRequest(
      @NotBlank @Size(max = 120) String key,
      @NotBlank @Size(max = 160) String label,
      @NotBlank @Size(max = 80) String moduleKey,
      @Size(max = 500) String description,
      boolean active
  ) {
  }
}
