package com.fawnix.sales.quotes.dto;

import com.fawnix.sales.quotes.entity.DiscountType;
import com.fawnix.sales.quotes.entity.QuoteStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class QuoteDtos {

  private QuoteDtos() {
  }

  public record QuoteLineItemRequest(
      @NotBlank(message = "Item name is required.")
      String name,
      String description,
      @NotNull(message = "Quantity is required.")
      @DecimalMin(value = "0.01", message = "Quantity must be greater than 0.")
      BigDecimal quantity,
      String unit,
      @NotNull(message = "Unit price is required.")
      @DecimalMin(value = "0.00", message = "Unit price must be at least 0.")
      BigDecimal unitPrice
  ) {
  }

  public record CreateQuoteRequest(
      @NotBlank(message = "Customer name is required.")
      String customerName,
      String company,
      String email,
      String phone,
      String billingAddress,
      String shippingAddress,
      String currency,
      QuoteStatus status,
      DiscountType discountType,
      BigDecimal discountValue,
      BigDecimal taxRate,
      Instant validUntil,
      String notes,
      String terms,
      @NotEmpty(message = "At least one line item is required.")
      @Valid
      List<QuoteLineItemRequest> items
  ) {
  }

  public record UpdateQuoteRequest(
      String customerName,
      String company,
      String email,
      String phone,
      String billingAddress,
      String shippingAddress,
      String currency,
      QuoteStatus status,
      DiscountType discountType,
      BigDecimal discountValue,
      BigDecimal taxRate,
      Instant validUntil,
      String notes,
      String terms,
      @Valid
      List<QuoteLineItemRequest> items
  ) {
  }

  public record UpdateQuoteStatusRequest(
      @NotNull(message = "Status is required.")
      QuoteStatus status
  ) {
  }

  public record QuoteLineItemResponse(
      String id,
      String name,
      String description,
      BigDecimal quantity,
      String unit,
      BigDecimal unitPrice,
      BigDecimal lineTotal
  ) {
  }

  public record QuoteResponse(
      String id,
      String quoteNumber,
      QuoteStatus status,
      String customerName,
      String company,
      String email,
      String phone,
      String billingAddress,
      String shippingAddress,
      String currency,
      DiscountType discountType,
      BigDecimal discountValue,
      BigDecimal subtotal,
      BigDecimal discountTotal,
      BigDecimal taxRate,
      BigDecimal taxTotal,
      BigDecimal total,
      Instant validUntil,
      String notes,
      String terms,
      List<QuoteLineItemResponse> items,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record QuoteSummary(
      String id,
      String quoteNumber,
      QuoteStatus status,
      String customerName,
      String company,
      BigDecimal total,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record QuoteListResponse(
      List<QuoteSummary> data,
      long total,
      int page,
      int pageSize,
      int totalPages
  ) {
  }
}
