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
@Table(name = "task_space_invitations")
public class TaskSpaceInvitationEntity {

  @Id
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "space_id", nullable = false)
  private TaskSpaceEntity space;

  @Column(name = "invitee_user_id", nullable = false, length = 64)
  private String inviteeUserId;

  @Column(name = "invitee_name", nullable = false, length = 160)
  private String inviteeName;

  @Column(name = "invitee_email", length = 200)
  private String inviteeEmail;

  @Column(name = "invited_by_id", nullable = false, length = 64)
  private String invitedById;

  @Column(name = "invited_by_name", nullable = false, length = 160)
  private String invitedByName;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 40)
  private TaskSpaceMemberRole role;

  @Column(columnDefinition = "text")
  private String permissions;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private TaskSpaceInvitationStatus status;

  @Column(columnDefinition = "text")
  private String message;

  @Column(name = "responded_at")
  private Instant respondedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public TaskSpaceEntity getSpace() { return space; }
  public void setSpace(TaskSpaceEntity space) { this.space = space; }
  public String getInviteeUserId() { return inviteeUserId; }
  public void setInviteeUserId(String inviteeUserId) { this.inviteeUserId = inviteeUserId; }
  public String getInviteeName() { return inviteeName; }
  public void setInviteeName(String inviteeName) { this.inviteeName = inviteeName; }
  public String getInviteeEmail() { return inviteeEmail; }
  public void setInviteeEmail(String inviteeEmail) { this.inviteeEmail = inviteeEmail; }
  public String getInvitedById() { return invitedById; }
  public void setInvitedById(String invitedById) { this.invitedById = invitedById; }
  public String getInvitedByName() { return invitedByName; }
  public void setInvitedByName(String invitedByName) { this.invitedByName = invitedByName; }
  public TaskSpaceMemberRole getRole() { return role; }
  public void setRole(TaskSpaceMemberRole role) { this.role = role; }
  public String getPermissions() { return permissions; }
  public void setPermissions(String permissions) { this.permissions = permissions; }
  public TaskSpaceInvitationStatus getStatus() { return status; }
  public void setStatus(TaskSpaceInvitationStatus status) { this.status = status; }
  public String getMessage() { return message; }
  public void setMessage(String message) { this.message = message; }
  public Instant getRespondedAt() { return respondedAt; }
  public void setRespondedAt(Instant respondedAt) { this.respondedAt = respondedAt; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
