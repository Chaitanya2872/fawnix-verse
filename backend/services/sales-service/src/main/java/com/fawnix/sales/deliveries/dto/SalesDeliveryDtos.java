package com.fawnix.sales.deliveries.dto;

import com.fawnix.sales.deliveries.entity.SalesDeliveryStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class SalesDeliveryDtos {

  private SalesDeliveryDtos() {
  }

  public record CreateSalesDeliveryRequest(
      @NotBlank(message = "Sales order is required.")
      String salesOrderId,
      LocalDate scheduledDate,
      String carrier,
      String trackingNumber,
      String notes
  ) {
  }

  public record UpdateSalesDeliveryStatusRequest(
      @NotNull(message = "Status is required.")
      SalesDeliveryStatus status
  ) {
  }

  public record SalesDeliveryResponse(
      String id,
      String deliveryNumber,
      String salesOrderId,
      String salesOrderNumber,
      String customerName,
      String company,
      String shippingAddress,
      SalesDeliveryStatus status,
      LocalDate scheduledDate,
      Instant dispatchedAt,
      Instant deliveredAt,
      String carrier,
      String trackingNumber,
      String notes,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record SalesDeliveryListResponse(List<SalesDeliveryResponse> data) {
  }
}
