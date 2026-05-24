package com.fawnix.inventory.reservations.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public final class InventoryReservationDtos {

  private InventoryReservationDtos() {
  }

  public record ReserveInventoryLineRequest(
      @NotBlank(message = "Product id is required.")
      String productId,
      @NotNull(message = "Quantity is required.")
      @DecimalMin(value = "0.01", message = "Quantity must be greater than zero.")
      BigDecimal quantity,
      String itemName
  ) {
  }

  public record ReserveInventoryRequest(
      @NotBlank(message = "Order id is required.")
      String orderId,
      @NotEmpty(message = "At least one inventory line is required.")
      @Valid
      List<ReserveInventoryLineRequest> items
  ) {
  }

  public record ReserveInventoryLineResponse(
      String productId,
      String sku,
      String productName,
      BigDecimal requestedQuantity,
      BigDecimal availableBeforeReservation,
      BigDecimal reservedQuantity
  ) {
  }

  public record ReserveInventoryResponse(
      String orderId,
      boolean reserved,
      String message,
      List<ReserveInventoryLineResponse> items
  ) {
  }
}
