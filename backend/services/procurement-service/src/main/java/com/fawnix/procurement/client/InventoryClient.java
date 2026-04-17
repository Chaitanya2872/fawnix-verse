package com.fawnix.procurement.client;

import com.fawnix.procurement.client.dto.InventoryProductResponse;
import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "inventory-service")
public interface InventoryClient {

  @GetMapping("/inventory/{id}")
  InventoryProductResponse getProduct(@PathVariable("id") UUID id);
}
