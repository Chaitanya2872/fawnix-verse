package com.fawnix.identity.access.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class AccessRequestDtos {

  private AccessRequestDtos() {
  }

  public record SubmitAccessRequest(
      @NotEmpty List<String> permissions,
      @Size(max = 1000) String requestNote
  ) {
  }

  public record ReviewAccessRequest(
      @NotBlank String decision,
      List<String> permissions,
      @Size(max = 1000) String reviewNote
  ) {
  }

  public record AccessRequestResponse(
      String id,
      RequesterSummary requester,
      List<String> permissions,
      String status,
      String requestNote,
      String reviewNote,
      ReviewerSummary reviewedBy,
      Instant reviewedAt,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record RequesterSummary(
      String id,
      String fullName,
      String email,
      List<String> roles
  ) {
  }

  public record ReviewerSummary(
      String id,
      String fullName,
      String email
  ) {
  }
}
