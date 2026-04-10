package com.fawnix.inventory.products.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class InventoryOverviewDtos {

  private InventoryOverviewDtos() {
  }

  public record CategorySummary(
      String category,
      int productCount,
      long brandCount,
      BigDecimal totalStockQty,
      long lowStockCount,
      long outOfStockCount
  ) {
  }

  public record BrandSummary(
      String brand,
      int productCount,
      long categoryCount,
      BigDecimal totalStockQty
  ) {
  }

  public record ConsumptionSummary(
      long outwardTransactionCount,
      BigDecimal consumedQuantity,
      LocalDate lastConsumedOn
  ) {
  }

  public record ConsumptionItem(
      String id,
      String sku,
      String productName,
      String category,
      String brand,
      LocalDate txnDate,
      BigDecimal quantity,
      String projectRef,
      String issuedBy,
      String notes
  ) {
  }

  public record InventoryOverviewResponse(
      int totalProducts,
      long totalCategories,
      long totalBrands,
      BigDecimal totalStockQty,
      List<CategorySummary> categories,
      List<BrandSummary> brands,
      ConsumptionSummary consumption,
      List<ConsumptionItem> recentConsumption
  ) {
  }
}
