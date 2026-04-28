package com.fawnix.identity.access.entity;

import com.fawnix.identity.users.entity.UserEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "access_requests")
public class AccessRequestEntity {

  @Id
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "requester_user_id", nullable = false)
  private UserEntity requester;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private AccessRequestStatus status;

  @Column(name = "request_note", length = 1000)
  private String requestNote;

  @Column(name = "review_note", length = 1000)
  private String reviewNote;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reviewed_by_user_id")
  private UserEntity reviewedBy;

  @Column(name = "reviewed_at")
  private Instant reviewedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(
      name = "access_request_permissions",
      joinColumns = @JoinColumn(name = "access_request_id")
  )
  @Column(name = "permission", nullable = false, length = 120)
  private Set<String> permissions = new LinkedHashSet<>();

  protected AccessRequestEntity() {
  }

  public AccessRequestEntity(
      String id,
      UserEntity requester,
      AccessRequestStatus status,
      String requestNote,
      Instant createdAt,
      Instant updatedAt
  ) {
    this.id = id;
    this.requester = requester;
    this.status = status;
    this.requestNote = requestNote;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public String getId() {
    return id;
  }

  public UserEntity getRequester() {
    return requester;
  }

  public AccessRequestStatus getStatus() {
    return status;
  }

  public void setStatus(AccessRequestStatus status) {
    this.status = status;
  }

  public String getRequestNote() {
    return requestNote;
  }

  public String getReviewNote() {
    return reviewNote;
  }

  public void setReviewNote(String reviewNote) {
    this.reviewNote = reviewNote;
  }

  public UserEntity getReviewedBy() {
    return reviewedBy;
  }

  public void setReviewedBy(UserEntity reviewedBy) {
    this.reviewedBy = reviewedBy;
  }

  public Instant getReviewedAt() {
    return reviewedAt;
  }

  public void setReviewedAt(Instant reviewedAt) {
    this.reviewedAt = reviewedAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }

  public Set<String> getPermissions() {
    return permissions;
  }

  public void setPermissions(Set<String> permissions) {
    this.permissions = permissions;
  }
}
