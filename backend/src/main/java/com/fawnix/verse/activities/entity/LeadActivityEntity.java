package com.fawnix.verse.activities.entity;

import com.fawnix.verse.leads.entity.LeadEntity;
import com.fawnix.verse.users.entity.UserEntity;
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
@Table(name = "lead_activities")
public class LeadActivityEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "lead_id", nullable = false)
  private LeadEntity lead;

  @Enumerated(EnumType.STRING)
  @Column(name = "activity_type", nullable = false, length = 50)
  private LeadActivityType activityType;

  @Column(nullable = false, columnDefinition = "text")
  private String content;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_by_user_id")
  private UserEntity createdByUser;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public LeadActivityEntity() {
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public LeadEntity getLead() {
    return lead;
  }

  public void setLead(LeadEntity lead) {
    this.lead = lead;
  }

  public LeadActivityType getActivityType() {
    return activityType;
  }

  public void setActivityType(LeadActivityType activityType) {
    this.activityType = activityType;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }

  public UserEntity getCreatedByUser() {
    return createdByUser;
  }

  public void setCreatedByUser(UserEntity createdByUser) {
    this.createdByUser = createdByUser;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
