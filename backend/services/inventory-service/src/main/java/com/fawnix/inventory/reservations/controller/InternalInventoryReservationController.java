package com.fawnix.inventory.reservations.controller;

import com.fawnix.inventory.reservations.dto.InventoryReservationDtos;
import com.fawnix.inventory.reservations.service.InventoryReservationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/inventory/reservations")
public class InternalInventoryReservationController {

  private final InventoryReservationService inventoryReservationService;

  public InternalInventoryReservationController(InventoryReservationService inventoryReservationService) {
    this.inventoryReservationService = inventoryReservationService;
  }

  @PostMapping("/reserve")
  public InventoryReservationDtos.ReserveInventoryResponse reserve(
      @Valid @RequestBody InventoryReservationDtos.ReserveInventoryRequest request
  ) {
    return inventoryReservationService.reserve(request);
  }
}
