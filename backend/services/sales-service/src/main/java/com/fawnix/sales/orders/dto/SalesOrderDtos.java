package com.fawnix.sales.orders.dto;

import com.fawnix.sales.orders.entity.SalesOrderStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class SalesOrderDtos {

  private SalesOrderDtos() {
  }

  public record SalesOrderItemRequest(
      String inventoryProductId,
      @NotBlank(message = "Item name is required.")
      String name,
      String make,
      String description,
      String utility,
      @NotNull(message = "Quantity is required.")
      @DecimalMin(value = "0.01", message = "Quantity must be greater than 0.")
      BigDecimal quantity,
      String unit,
      @NotNull(message = "Unit price is required.")
      @DecimalMin(value = "0.00", message = "Unit price must be at least 0.")
      BigDecimal unitPrice
  ) {
  }

  public record CreateSalesOrderRequest(
      String quoteId,
      String leadId,
      @NotBlank(message = "Customer name is required.")
      String customerName,
      String company,
      String email,
      String phone,
      String billingAddress,
      String shippingAddress,
      String currency,
      SalesOrderStatus status,
      BigDecimal taxRate,
      String notes,
      @NotEmpty(message = "At least one line item is required.")
      @Valid
      List<SalesOrderItemRequest> items
  ) {
  }

  public record UpdateSalesOrderRequest(
      String customerName,
      String company,
      String email,
      String phone,
      String billingAddress,
      String shippingAddress,
      String currency,
      BigDecimal taxRate,
      String notes,
      @Valid
      List<SalesOrderItemRequest> items
  ) {
  }

  public record UpdateSalesOrderStatusRequest(
      @NotNull(message = "Status is required.")
      SalesOrderStatus status
  ) {
  }

  public record SalesOrderItemResponse(
      String id,
      String inventoryProductId,
      String name,
      String make,
      String description,
      String utility,
      BigDecimal quantity,
      String unit,
      BigDecimal unitPrice,
      BigDecimal lineTotal
  ) {
  }

  public record SalesOrderResponse(
      String id,
      String orderNumber,
      String quoteId,
      String leadId,
      SalesOrderStatus status,
      String customerName,
      String company,
      String email,
      String phone,
      String billingAddress,
      String shippingAddress,
      String currency,
      BigDecimal subtotal,
      BigDecimal taxRate,
      BigDecimal taxTotal,
      BigDecimal total,
      boolean inventoryReserved,
      String inventoryReservationMessage,
      Instant inventoryReservedAt,
      String notes,
      List<SalesOrderItemResponse> items,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record SalesOrderSummary(
      String id,
      String orderNumber,
      String quoteId,
      SalesOrderStatus status,
      String customerName,
      String company,
      BigDecimal total,
      boolean inventoryReserved,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record SalesOrderListResponse(
      List<SalesOrderSummary> data,
      long total,
      int page,
      int pageSize,
      int totalPages
  ) {
  }
}
