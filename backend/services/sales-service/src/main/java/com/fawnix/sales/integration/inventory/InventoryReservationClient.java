package com.fawnix.sales.integration.inventory;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class InventoryReservationClient {

  private final RestTemplate internalRestTemplate;
  private final String inventoryServiceUrl;

  public InventoryReservationClient(
      RestTemplate internalRestTemplate,
      @Value("${app.services.inventory-url:http://localhost:8083}") String inventoryServiceUrl
  ) {
    this.internalRestTemplate = internalRestTemplate;
    this.inventoryServiceUrl = inventoryServiceUrl;
  }

  public ReserveInventoryResponse reserve(String orderId, List<ReserveInventoryLineRequest> items) {
    return internalRestTemplate.postForObject(
        inventoryServiceUrl + "/internal/inventory/reservations/reserve",
        new ReserveInventoryRequest(orderId, items),
        ReserveInventoryResponse.class
    );
  }

  public record ReserveInventoryRequest(String orderId, List<ReserveInventoryLineRequest> items) {
  }

  public record ReserveInventoryLineRequest(String productId, BigDecimal quantity, String itemName) {
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
