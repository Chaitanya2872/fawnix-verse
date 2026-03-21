package com.fawnix.crm.accounts.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;

public final class AccountDtos {

  private AccountDtos() {
  }

  public record CreateAccountRequest(
      @NotBlank String name,
      String industry,
      String website,
      String address,
      String ownerUserId
  ) {
  }

  public record UpdateAccountRequest(
      String name,
      String industry,
      String website,
      String address,
      String ownerUserId
  ) {
  }

  public record AccountResponse(
      String id,
      String name,
      String industry,
      String website,
      String address,
      String ownerUserId,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record PaginatedAccountResponse(
      List<AccountResponse> data,
      long total,
      int page,
      int pageSize,
      int totalPages
  ) {
  }
}
