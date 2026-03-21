package com.fawnix.crm.deals.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class DealDtos {

  private DealDtos() {
  }

  public record CreateDealRequest(
      @NotBlank String name,
      String stage,
      @DecimalMin(value = "0.0", inclusive = true) BigDecimal value,
      Integer probability,
      Instant expectedCloseAt,
      String accountId,
      String contactId,
      String leadId,
      String ownerUserId
  ) {
  }

  public record UpdateDealRequest(
      String name,
      String stage,
      @DecimalMin(value = "0.0", inclusive = true) BigDecimal value,
      Integer probability,
      Instant expectedCloseAt,
      String accountId,
      String contactId,
      String leadId,
      String ownerUserId
  ) {
  }

  public record UpdateDealStageRequest(
      @NotBlank String stage
  ) {
  }

  public record DealAccountSummary(
      String id,
      String name
  ) {
  }

  public record DealContactSummary(
      String id,
      String name,
      String email,
      String phone
  ) {
  }

  public record DealResponse(
      String id,
      String name,
      String stage,
      BigDecimal value,
      Integer probability,
      Instant expectedCloseAt,
      DealAccountSummary account,
      DealContactSummary contact,
      String leadId,
      String ownerUserId,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record PaginatedDealResponse(
      List<DealResponse> data,
      long total,
      int page,
      int pageSize,
      int totalPages
  ) {
  }
}
