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

  public ValidateInventoryResponse validate(String orderId, List<ReserveInventoryLineRequest> items) {
    return internalRestTemplate.postForObject(
        inventoryServiceUrl + "/internal/inventory/reservations/validate",
        new ValidateInventoryRequest(orderId, items),
        ValidateInventoryResponse.class
    );
  }

  public FulfillInventoryResponse fulfill(String orderId, List<ReserveInventoryLineRequest> items) {
    return internalRestTemplate.postForObject(
        inventoryServiceUrl + "/internal/inventory/reservations/fulfill",
        new FulfillInventoryRequest(orderId, items),
        FulfillInventoryResponse.class
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

  public record ValidateInventoryRequest(String orderId, List<ReserveInventoryLineRequest> items) {
  }

  public record ValidateInventoryLineResponse(
      String productId,
      String sku,
      String productName,
      BigDecimal requestedQuantity,
      BigDecimal availableQuantity,
      boolean available
  ) {
  }

  public record ValidateInventoryResponse(
      String orderId,
      boolean allAvailable,
      String message,
      List<ValidateInventoryLineResponse> items
  ) {
  }

  public record FulfillInventoryRequest(String orderId, List<ReserveInventoryLineRequest> items) {
  }

  public record FulfillInventoryResponse(
      String orderId,
      boolean fulfilled,
      String message,
      List<ReserveInventoryLineResponse> items
  ) {
  }
}
