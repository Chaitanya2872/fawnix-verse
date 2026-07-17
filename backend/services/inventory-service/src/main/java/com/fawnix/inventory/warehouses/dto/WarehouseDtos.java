package com.fawnix.inventory.warehouses.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class WarehouseDtos {

  private WarehouseDtos() {
  }

  public record CreateWarehouseRequest(
      @NotBlank(message = "Warehouse code is required.")
      String code,
      @NotBlank(message = "Warehouse name is required.")
      String name,
      String type,
      String addressLine1,
      String addressLine2,
      @NotBlank(message = "City is required.")
      String city,
      String state,
      String postalCode,
      String country,
      String managerName,
      String contactPhone,
      @Email(message = "Contact email must be valid.")
      String contactEmail,
      @DecimalMin(value = "0.00", message = "Capacity cannot be negative.")
      BigDecimal capacity,
      Boolean active,
      String notes,
      List<StorageLocationRequest> storageLocations
  ) {
  }

  public record UpdateWarehouseRequest(
      String code,
      String name,
      String type,
      String addressLine1,
      String addressLine2,
      String city,
      String state,
      String postalCode,
      String country,
      String managerName,
      String contactPhone,
      @Email(message = "Contact email must be valid.")
      String contactEmail,
      @DecimalMin(value = "0.00", message = "Capacity cannot be negative.")
      BigDecimal capacity,
      Boolean active,
      String notes,
      List<StorageLocationRequest> storageLocations
  ) {
  }

  public record StorageLocationRequest(
      String id,
      @NotBlank(message = "Storage location code is required.")
      String code,
      @NotBlank(message = "Storage location name is required.")
      String name,
      String zoneName,
      String rackName,
      String binName,
      @DecimalMin(value = "0.00", message = "Location capacity cannot be negative.")
      BigDecimal capacity,
      Boolean active,
      String notes
  ) {
  }

  public record StorageLocationResponse(
      String id,
      String code,
      String name,
      String zoneName,
      String rackName,
      String binName,
      BigDecimal capacity,
      boolean active,
      String notes,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record WarehouseResponse(
      String id,
      String code,
      String name,
      String type,
      String addressLine1,
      String addressLine2,
      String city,
      String state,
      String postalCode,
      String country,
      String managerName,
      String contactPhone,
      String contactEmail,
      BigDecimal capacity,
      boolean active,
      String notes,
      List<StorageLocationResponse> storageLocations,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record WarehouseListResponse(
      List<WarehouseResponse> data,
      long total,
      int page,
      int pageSize,
      int totalPages
  ) {
  }
}
