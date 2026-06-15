package com.fawnix.sales.payments.dto;

import com.fawnix.sales.payments.entity.PaymentMode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class SalesPaymentDtos {

  private SalesPaymentDtos() {
  }

  public record CreateSalesPaymentRequest(
      @NotBlank(message = "Sales invoice is required.")
      String salesInvoiceId,
      @NotNull(message = "Payment date is required.")
      LocalDate paymentDate,
      @NotNull(message = "Amount is required.")
      @DecimalMin(value = "0.01", message = "Amount must be greater than 0.")
      BigDecimal amount,
      @NotNull(message = "Payment mode is required.")
      PaymentMode paymentMode,
      String referenceNumber,
      String remarks
  ) {
  }

  public record SalesPaymentResponse(
      String id,
      String paymentNumber,
      String salesInvoiceId,
      String salesOrderId,
      String customerName,
      String currency,
      PaymentMode paymentMode,
      LocalDate paymentDate,
      BigDecimal amount,
      String referenceNumber,
      String remarks,
      Instant createdAt
  ) {
  }

  public record SalesPaymentListResponse(List<SalesPaymentResponse> data) {
  }
}
