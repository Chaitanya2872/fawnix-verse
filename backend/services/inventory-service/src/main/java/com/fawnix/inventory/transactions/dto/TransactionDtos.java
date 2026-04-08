package com.fawnix.inventory.transactions.dto;

import com.fawnix.inventory.transactions.entity.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class TransactionDtos {

  private TransactionDtos() {
  }

  public record CreateTransactionRequest(
      @NotBlank(message = "Product SKU is required.")
      String sku,
      @NotBlank(message = "Transaction reference is required.")
      String txnRef,
      @NotNull(message = "Transaction date is required.")
      LocalDate txnDate,
      @NotNull(message = "Transaction type is required.")
      TransactionType txnType,
      @NotBlank(message = "Vendor name is required.")
      String vendorName,
      @NotNull(message = "Quantity is required.")
      @DecimalMin(value = "0.01", message = "Quantity must be greater than 0.")
      BigDecimal quantity,
      @DecimalMin(value = "0.00", message = "Unit price must be at least 0.")
      BigDecimal unitPrice,
      String projectRef,
      String issuedBy,
      String notes
  ) {
  }

  public record TransactionResponse(
      String id,
      String sku,
      String productName,
      String txnRef,
      LocalDate txnDate,
      TransactionType txnType,
      String vendorName,
      BigDecimal quantity,
      BigDecimal unitPrice,
      BigDecimal lineTotal,
      String projectRef,
      String issuedBy,
      String notes,
      Instant createdAt
  ) {
  }

  public record TransactionListResponse(
      List<TransactionResponse> data
  ) {
  }
}
