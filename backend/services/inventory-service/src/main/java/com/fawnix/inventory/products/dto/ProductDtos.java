package com.fawnix.inventory.products.dto;

import com.fawnix.inventory.products.entity.ProductStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class ProductDtos {

  private ProductDtos() {
  }

  public record CreateProductRequest(
      @NotBlank(message = "SKU is required.")
      String sku,
      @NotBlank(message = "Product name is required.")
      String name,
      @NotBlank(message = "Category is required.")
      String category,
      String subCategory,
      String brand,
      String unit,
      @DecimalMin(value = "0.00", message = "Reorder level cannot be negative.")
      BigDecimal reorderLevel,
      String description,
      String hsnCode,
      String notes,
      @DecimalMin(value = "0.00", message = "Price must be at least 0.")
      BigDecimal price,
      @DecimalMin(value = "0.00", message = "Price 1 must be at least 0.")
      BigDecimal priceTier1,
      @DecimalMin(value = "0.00", message = "Price 2 must be at least 0.")
      BigDecimal priceTier2,
      @DecimalMin(value = "0.00", message = "Price 3 must be at least 0.")
      BigDecimal priceTier3,
      @DecimalMin(value = "0.00", message = "Stock quantity cannot be negative.")
      BigDecimal stockQty,
      List<ProductStorageMappingRequest> storageMappings
  ) {
  }

  public record UpdateProductRequest(
      String sku,
      String name,
      String category,
      String subCategory,
      String brand,
      String unit,
      BigDecimal reorderLevel,
      String description,
      String hsnCode,
      String notes,
      BigDecimal price,
      BigDecimal priceTier1,
      BigDecimal priceTier2,
      BigDecimal priceTier3,
      BigDecimal stockQty,
      List<ProductStorageMappingRequest> storageMappings
  ) {
  }

  public record ProductStorageMappingRequest(
      String id,
      @NotBlank(message = "Warehouse ID is required.")
      String warehouseId,
      @NotBlank(message = "Storage location ID is required.")
      String storageLocationId,
      @DecimalMin(value = "0.00", message = "Quantity on hand cannot be negative.")
      BigDecimal quantityOnHand,
      @DecimalMin(value = "0.00", message = "Minimum stock cannot be negative.")
      BigDecimal minStockLevel,
      @DecimalMin(value = "0.00", message = "Maximum stock cannot be negative.")
      BigDecimal maxStockLevel,
      Boolean primaryMapping,
      String notes
  ) {
  }

  public record ProductStorageMappingResponse(
      String id,
      String warehouseId,
      String warehouseCode,
      String warehouseName,
      String storageLocationId,
      String storageLocationCode,
      String storageLocationName,
      String zoneName,
      String rackName,
      String binName,
      BigDecimal quantityOnHand,
      BigDecimal minStockLevel,
      BigDecimal maxStockLevel,
      boolean primaryMapping,
      String notes,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record ProductResponse(
      String id,
      String sku,
      String name,
      String category,
      String subCategory,
      String brand,
      String unit,
      BigDecimal reorderLevel,
      String description,
      String hsnCode,
      String notes,
      BigDecimal price,
      BigDecimal priceTier1,
      BigDecimal priceTier2,
      BigDecimal priceTier3,
      BigDecimal stockQty,
      ProductStatus status,
      List<ProductStorageMappingResponse> storageMappings,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record ProductListResponse(
      List<ProductResponse> data,
      long total,
      int page,
      int pageSize,
      int totalPages
  ) {
  }
}
