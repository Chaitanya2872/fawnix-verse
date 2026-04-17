package com.fawnix.procurement.client.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InventoryProductResponse(
    UUID id,
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
    String status,
    Instant createdAt,
    Instant updatedAt
) {
}
