package com.fawnix.identity.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "permissions")
public class PermissionEntity {

  @Id
  @Column(length = 120, nullable = false)
  private String key;

  @Column(nullable = false, length = 160)
  private String label;

  @Column(name = "module_key", nullable = false, length = 80)
  private String moduleKey;

  @Column(length = 500)
  private String description;

  @Column(nullable = false)
  private boolean active = true;

  @Column(name = "system_defined", nullable = false)
  private boolean systemDefined = false;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected PermissionEntity() {
  }

  public PermissionEntity(
      String key,
      String label,
      String moduleKey,
      String description,
      boolean active,
      boolean systemDefined,
      Instant createdAt,
      Instant updatedAt
  ) {
    this.key = key;
    this.label = label;
    this.moduleKey = moduleKey;
    this.description = description;
    this.active = active;
    this.systemDefined = systemDefined;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public String getKey() {
    return key;
  }

  public void setKey(String key) {
    this.key = key;
  }

  public String getLabel() {
    return label;
  }

  public void setLabel(String label) {
    this.label = label;
  }

  public String getModuleKey() {
    return moduleKey;
  }

  public void setModuleKey(String moduleKey) {
    this.moduleKey = moduleKey;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }

  public boolean isSystemDefined() {
    return systemDefined;
  }

  public void setSystemDefined(boolean systemDefined) {
    this.systemDefined = systemDefined;
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
