package com.fawnix.sales.invoices.dto;

import com.fawnix.sales.invoices.entity.SalesInvoiceStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class SalesInvoiceDtos {

  private SalesInvoiceDtos() {
  }

  public record CreateSalesInvoiceRequest(
      @NotBlank(message = "Sales order is required.")
      String salesOrderId,
      LocalDate dueDate,
      String notes
  ) {
  }

  public record UpdateSalesInvoiceStatusRequest(
      @NotNull(message = "Status is required.")
      SalesInvoiceStatus status,
      @DecimalMin(value = "0.00", message = "Balance due must be 0 or more.")
      BigDecimal balanceDue
  ) {
  }

  public record SalesInvoiceResponse(
      String id,
      String invoiceNumber,
      String salesOrderId,
      String salesOrderNumber,
      String customerName,
      String company,
      String billingAddress,
      String currency,
      SalesInvoiceStatus status,
      LocalDate dueDate,
      Instant issuedAt,
      Instant paidAt,
      BigDecimal subtotal,
      BigDecimal taxTotal,
      BigDecimal total,
      BigDecimal balanceDue,
      String notes,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record SalesInvoiceListResponse(List<SalesInvoiceResponse> data) {
  }
}
