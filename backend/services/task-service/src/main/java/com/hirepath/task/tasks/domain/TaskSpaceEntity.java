package com.hirepath.task.tasks.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "task_spaces")
public class TaskSpaceEntity {

  @Id
  private String id;

  @Column(name = "space_key", nullable = false, unique = true, length = 80)
  private String spaceKey;

  @Column(nullable = false, length = 160)
  private String name;

  @Column(columnDefinition = "text")
  private String description;

  @Column(name = "icon_name", length = 80)
  private String iconName;

  @Column(name = "color_hex", length = 20)
  private String colorHex;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private TaskSpaceVisibility visibility;

  @Column(name = "owner_user_id", nullable = false, length = 64)
  private String ownerUserId;

  @Column(name = "owner_user_name", nullable = false, length = 160)
  private String ownerUserName;

  @Column(nullable = false)
  private boolean archived;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getSpaceKey() { return spaceKey; }
  public void setSpaceKey(String spaceKey) { this.spaceKey = spaceKey; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getIconName() { return iconName; }
  public void setIconName(String iconName) { this.iconName = iconName; }
  public String getColorHex() { return colorHex; }
  public void setColorHex(String colorHex) { this.colorHex = colorHex; }
  public TaskSpaceVisibility getVisibility() { return visibility; }
  public void setVisibility(TaskSpaceVisibility visibility) { this.visibility = visibility; }
  public String getOwnerUserId() { return ownerUserId; }
  public void setOwnerUserId(String ownerUserId) { this.ownerUserId = ownerUserId; }
  public String getOwnerUserName() { return ownerUserName; }
  public void setOwnerUserName(String ownerUserName) { this.ownerUserName = ownerUserName; }
  public boolean isArchived() { return archived; }
  public void setArchived(boolean archived) { this.archived = archived; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
