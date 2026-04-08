package com.fawnix.inventory.products.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "products")
public class ProductEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "sku", length = 30, nullable = false, unique = true)
  private String sku;

  @Column(name = "product_name", length = 200, nullable = false)
  private String name;

  @Column(name = "category", length = 60, nullable = false)
  private String category;

  @Column(name = "sub_category", length = 60)
  private String subCategory;

  @Column(name = "brand", length = 60)
  private String brand;

  @Column(name = "unit", length = 20, nullable = false)
  private String unit;

  @Column(name = "reorder_level", precision = 12, scale = 2)
  private BigDecimal reorderLevel = BigDecimal.ZERO;

  @Column(name = "description", columnDefinition = "text")
  private String description;

  @Column(name = "hsn_code", length = 30)
  private String hsnCode;

  @Column(name = "notes", columnDefinition = "text")
  private String notes;

  @Column(name = "price", precision = 14, scale = 2, nullable = false)
  private BigDecimal price = BigDecimal.ZERO;

  @Column(name = "stock_qty", precision = 14, scale = 2, nullable = false)
  private BigDecimal stockQty = BigDecimal.ZERO;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", length = 20, nullable = false)
  private ProductStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getSku() {
    return sku;
  }

  public void setSku(String sku) {
    this.sku = sku;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public String getSubCategory() {
    return subCategory;
  }

  public void setSubCategory(String subCategory) {
    this.subCategory = subCategory;
  }

  public String getBrand() {
    return brand;
  }

  public void setBrand(String brand) {
    this.brand = brand;
  }

  public String getUnit() {
    return unit;
  }

  public void setUnit(String unit) {
    this.unit = unit;
  }

  public BigDecimal getReorderLevel() {
    return reorderLevel;
  }

  public void setReorderLevel(BigDecimal reorderLevel) {
    this.reorderLevel = reorderLevel;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getHsnCode() {
    return hsnCode;
  }

  public void setHsnCode(String hsnCode) {
    this.hsnCode = hsnCode;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public BigDecimal getPrice() {
    return price;
  }

  public void setPrice(BigDecimal price) {
    this.price = price;
  }

  public BigDecimal getStockQty() {
    return stockQty;
  }

  public void setStockQty(BigDecimal stockQty) {
    this.stockQty = stockQty;
  }

  public ProductStatus getStatus() {
    return status;
  }

  public void setStatus(ProductStatus status) {
    this.status = status;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
