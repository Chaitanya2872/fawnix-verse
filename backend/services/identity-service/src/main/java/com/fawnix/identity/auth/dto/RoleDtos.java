package com.fawnix.identity.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class RoleDtos {

  private RoleDtos() {
  }

  public record RoleResponse(
      String id,
      String key,
      String name,
      String description,
      boolean active,
      boolean systemDefined,
      List<String> permissions,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record CreateRoleRequest(
      @NotBlank @Size(max = 120) String name,
      @Size(max = 500) String description,
      List<String> permissions
  ) {
  }

  public record UpdateRoleRequest(
      @NotBlank @Size(max = 120) String name,
      @Size(max = 500) String description,
      List<String> permissions
  ) {
  }

  public record CloneRoleRequest(
      @NotBlank @Size(max = 120) String name
  ) {
  }

  public record UpdateRoleStatusRequest(
      boolean active
  ) {
  }
}
