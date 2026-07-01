package com.fawnix.inventory.warehouses.controller;

import com.fawnix.inventory.warehouses.dto.WarehouseDtos;
import com.fawnix.inventory.warehouses.service.WarehouseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inventory/warehouses")
public class WarehouseController {

  private final WarehouseService warehouseService;

  public WarehouseController(WarehouseService warehouseService) {
    this.warehouseService = warehouseService;
  }

  @GetMapping
  public WarehouseDtos.WarehouseListResponse listWarehouses(
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "20") int pageSize
  ) {
    return warehouseService.getWarehouses(search, status, page, pageSize);
  }

  @GetMapping("/{id}")
  public WarehouseDtos.WarehouseResponse getWarehouse(@PathVariable String id) {
    return warehouseService.getWarehouse(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public WarehouseDtos.WarehouseResponse createWarehouse(
      @Valid @RequestBody WarehouseDtos.CreateWarehouseRequest request
  ) {
    return warehouseService.createWarehouse(request);
  }

  @PatchMapping("/{id}")
  public WarehouseDtos.WarehouseResponse updateWarehouse(
      @PathVariable String id,
      @Valid @RequestBody WarehouseDtos.UpdateWarehouseRequest request
  ) {
    return warehouseService.updateWarehouse(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteWarehouse(@PathVariable String id) {
    warehouseService.deleteWarehouse(id);
  }
}
