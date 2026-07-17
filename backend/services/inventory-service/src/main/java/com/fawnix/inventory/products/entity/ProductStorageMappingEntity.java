package com.fawnix.inventory.products.entity;

import com.fawnix.inventory.warehouses.entity.StorageLocationEntity;
import com.fawnix.inventory.warehouses.entity.WarehouseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "product_storage_mappings")
public class ProductStorageMappingEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "product_id", nullable = false)
  private ProductEntity product;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "warehouse_id", nullable = false)
  private WarehouseEntity warehouse;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "storage_location_id", nullable = false)
  private StorageLocationEntity storageLocation;

  @Column(name = "quantity_on_hand", precision = 14, scale = 2, nullable = false)
  private BigDecimal quantityOnHand = BigDecimal.ZERO;

  @Column(name = "min_stock_level", precision = 14, scale = 2)
  private BigDecimal minStockLevel;

  @Column(name = "max_stock_level", precision = 14, scale = 2)
  private BigDecimal maxStockLevel;

  @Column(name = "primary_mapping", nullable = false)
  private boolean primaryMapping;

  @Column(name = "notes", columnDefinition = "text")
  private String notes;

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

  public ProductEntity getProduct() {
    return product;
  }

  public void setProduct(ProductEntity product) {
    this.product = product;
  }

  public WarehouseEntity getWarehouse() {
    return warehouse;
  }

  public void setWarehouse(WarehouseEntity warehouse) {
    this.warehouse = warehouse;
  }

  public StorageLocationEntity getStorageLocation() {
    return storageLocation;
  }

  public void setStorageLocation(StorageLocationEntity storageLocation) {
    this.storageLocation = storageLocation;
  }

  public BigDecimal getQuantityOnHand() {
    return quantityOnHand;
  }

  public void setQuantityOnHand(BigDecimal quantityOnHand) {
    this.quantityOnHand = quantityOnHand;
  }

  public BigDecimal getMinStockLevel() {
    return minStockLevel;
  }

  public void setMinStockLevel(BigDecimal minStockLevel) {
    this.minStockLevel = minStockLevel;
  }

  public BigDecimal getMaxStockLevel() {
    return maxStockLevel;
  }

  public void setMaxStockLevel(BigDecimal maxStockLevel) {
    this.maxStockLevel = maxStockLevel;
  }

  public boolean isPrimaryMapping() {
    return primaryMapping;
  }

  public void setPrimaryMapping(boolean primaryMapping) {
    this.primaryMapping = primaryMapping;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
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
