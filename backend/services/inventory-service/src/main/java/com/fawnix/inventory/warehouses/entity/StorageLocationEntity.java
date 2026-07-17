package com.fawnix.inventory.warehouses.entity;

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
@Table(name = "storage_locations")
public class StorageLocationEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "warehouse_id", nullable = false)
  private WarehouseEntity warehouse;

  @Column(name = "location_code", length = 40, nullable = false)
  private String code;

  @Column(name = "location_name", length = 160, nullable = false)
  private String name;

  @Column(name = "zone_name", length = 80)
  private String zoneName;

  @Column(name = "rack_name", length = 80)
  private String rackName;

  @Column(name = "bin_name", length = 80)
  private String binName;

  @Column(name = "capacity", precision = 14, scale = 2, nullable = false)
  private BigDecimal capacity = BigDecimal.ZERO;

  @Column(name = "active", nullable = false)
  private boolean active = true;

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

  public WarehouseEntity getWarehouse() {
    return warehouse;
  }

  public void setWarehouse(WarehouseEntity warehouse) {
    this.warehouse = warehouse;
  }

  public String getCode() {
    return code;
  }

  public void setCode(String code) {
    this.code = code;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getZoneName() {
    return zoneName;
  }

  public void setZoneName(String zoneName) {
    this.zoneName = zoneName;
  }

  public String getRackName() {
    return rackName;
  }

  public void setRackName(String rackName) {
    this.rackName = rackName;
  }

  public String getBinName() {
    return binName;
  }

  public void setBinName(String binName) {
    this.binName = binName;
  }

  public BigDecimal getCapacity() {
    return capacity;
  }

  public void setCapacity(BigDecimal capacity) {
    this.capacity = capacity;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
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
