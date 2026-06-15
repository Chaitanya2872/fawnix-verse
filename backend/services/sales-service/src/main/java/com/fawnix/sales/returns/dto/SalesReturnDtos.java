package com.fawnix.sales.returns.dto;

import com.fawnix.sales.returns.entity.SalesReturnStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class SalesReturnDtos {

  private SalesReturnDtos() {
  }

  public record CreateSalesReturnRequest(
      @NotBlank(message = "Sales order is required.")
      String salesOrderId,
      String salesInvoiceId,
      @NotBlank(message = "Return reason is required.")
      String returnReason,
      @NotNull(message = "Requested amount is required.")
      @DecimalMin(value = "0.00", message = "Requested amount must be at least 0.")
      BigDecimal requestedAmount,
      String remarks
  ) {
  }

  public record UpdateSalesReturnStatusRequest(
      @NotNull(message = "Status is required.")
      SalesReturnStatus status,
      @DecimalMin(value = "0.00", message = "Approved amount must be at least 0.")
      BigDecimal approvedAmount,
      String remarks
  ) {
  }

  public record SalesCreditNoteResponse(
      String id,
      String creditNoteNumber,
      String salesReturnId,
      String salesInvoiceId,
      String customerName,
      String currency,
      BigDecimal amount,
      String remarks,
      Instant createdAt
  ) {
  }

  public record SalesReturnResponse(
      String id,
      String returnNumber,
      String salesOrderId,
      String salesInvoiceId,
      String customerName,
      SalesReturnStatus status,
      String returnReason,
      BigDecimal requestedAmount,
      BigDecimal approvedAmount,
      String remarks,
      String approvedByName,
      Instant createdAt,
      Instant approvedAt,
      List<SalesCreditNoteResponse> creditNotes
  ) {
  }

  public record SalesReturnListResponse(List<SalesReturnResponse> data) {
  }
}
