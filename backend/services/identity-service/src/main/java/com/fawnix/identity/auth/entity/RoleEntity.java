package com.fawnix.identity.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import com.fawnix.identity.auth.entity.PermissionEntity;

@Entity
@Table(name = "roles")
public class RoleEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(nullable = false, unique = true, length = 50)
  private String name;

  @Column(name = "display_name", nullable = false, length = 120)
  private String displayName;

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

  @ManyToMany
  @JoinTable(
      name = "role_permissions",
      joinColumns = @JoinColumn(name = "role_id"),
      inverseJoinColumns = @JoinColumn(name = "permission_key", referencedColumnName = "key")
  )
  private Set<PermissionEntity> permissions = new LinkedHashSet<>();

  protected RoleEntity() {
  }

  public RoleEntity(String id, String name, String displayName, String description, boolean active, boolean systemDefined, Instant createdAt, Instant updatedAt) {
    this.id = id;
    this.name = name;
    this.displayName = displayName;
    this.description = description;
    this.active = active;
    this.systemDefined = systemDefined;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getDisplayName() {
    return displayName;
  }

  public void setDisplayName(String displayName) {
    this.displayName = displayName;
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

  public Set<PermissionEntity> getPermissions() {
    return permissions;
  }

  public void setPermissions(Set<PermissionEntity> permissions) {
    this.permissions = permissions == null ? new LinkedHashSet<>() : new LinkedHashSet<>(permissions);
  }
}
