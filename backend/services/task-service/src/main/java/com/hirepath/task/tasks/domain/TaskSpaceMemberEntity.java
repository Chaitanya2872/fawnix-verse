package com.hirepath.task.tasks.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "task_space_members")
public class TaskSpaceMemberEntity {

  @Id
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "space_id", nullable = false)
  private TaskSpaceEntity space;

  @Column(name = "user_id", nullable = false, length = 64)
  private String userId;

  @Column(name = "user_name", nullable = false, length = 160)
  private String userName;

  @Column(name = "user_email", length = 200)
  private String userEmail;

  @Column(columnDefinition = "text")
  private String permissions;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 40)
  private TaskSpaceMemberRole role;

  @Column(nullable = false)
  private boolean active;

  @Column(name = "invited_by_id", length = 64)
  private String invitedById;

  @Column(name = "invited_by_name", length = 160)
  private String invitedByName;

  @Column(name = "joined_at", nullable = false)
  private Instant joinedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public TaskSpaceEntity getSpace() { return space; }
  public void setSpace(TaskSpaceEntity space) { this.space = space; }
  public String getUserId() { return userId; }
  public void setUserId(String userId) { this.userId = userId; }
  public String getUserName() { return userName; }
  public void setUserName(String userName) { this.userName = userName; }
  public String getUserEmail() { return userEmail; }
  public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
  public String getPermissions() { return permissions; }
  public void setPermissions(String permissions) { this.permissions = permissions; }
  public TaskSpaceMemberRole getRole() { return role; }
  public void setRole(TaskSpaceMemberRole role) { this.role = role; }
  public boolean isActive() { return active; }
  public void setActive(boolean active) { this.active = active; }
  public String getInvitedById() { return invitedById; }
  public void setInvitedById(String invitedById) { this.invitedById = invitedById; }
  public String getInvitedByName() { return invitedByName; }
  public void setInvitedByName(String invitedByName) { this.invitedByName = invitedByName; }
  public Instant getJoinedAt() { return joinedAt; }
  public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
