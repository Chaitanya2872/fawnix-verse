package com.fawnix.inventory.products.dto;

import com.fawnix.inventory.products.entity.ProductStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
      @NotNull(message = "Price is required.")
      @DecimalMin(value = "0.00", message = "Price must be at least 0.")
      BigDecimal price,
      @DecimalMin(value = "0.00", message = "Stock quantity cannot be negative.")
      BigDecimal stockQty
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
      BigDecimal stockQty
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
      BigDecimal stockQty,
      ProductStatus status,
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
