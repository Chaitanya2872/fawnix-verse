package com.fawnix.verse.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "roles")
public class RoleEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(nullable = false, unique = true, length = 50)
  private String name;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected RoleEntity() {
  }

  public RoleEntity(String id, String name, Instant createdAt) {
    this.id = id;
    this.name = name;
    this.createdAt = createdAt;
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

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
