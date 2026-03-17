package com.fawnix.crm.leads.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "lead_schedules")
public class LeadScheduleEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @ManyToOne
  @JoinColumn(name = "lead_id", nullable = false)
  private LeadEntity lead;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private LeadScheduleType type;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private LeadScheduleStatus status;

  @Column(name = "scheduled_at", nullable = false)
  private Instant scheduledAt;

  @Column(length = 200)
  private String location;

  @Enumerated(EnumType.STRING)
  @Column(length = 20)
  private LeadScheduleMode mode;

  @Column(columnDefinition = "text")
  private String notes;

  @Column(name = "assigned_to_user_id", length = 36)
  private String assignedToUserId;

  @Column(name = "assigned_to_name", length = 120)
  private String assignedToName;

  @Column(name = "created_by_user_id", length = 36)
  private String createdByUserId;

  @Column(name = "created_by_name", length = 120)
  private String createdByName;

  @Column(name = "updated_by_user_id", length = 36)
  private String updatedByUserId;

  @Column(name = "updated_by_name", length = 120)
  private String updatedByName;

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

  public LeadEntity getLead() {
    return lead;
  }

  public void setLead(LeadEntity lead) {
    this.lead = lead;
  }

  public LeadScheduleType getType() {
    return type;
  }

  public void setType(LeadScheduleType type) {
    this.type = type;
  }

  public LeadScheduleStatus getStatus() {
    return status;
  }

  public void setStatus(LeadScheduleStatus status) {
    this.status = status;
  }

  public Instant getScheduledAt() {
    return scheduledAt;
  }

  public void setScheduledAt(Instant scheduledAt) {
    this.scheduledAt = scheduledAt;
  }

  public String getLocation() {
    return location;
  }

  public void setLocation(String location) {
    this.location = location;
  }

  public LeadScheduleMode getMode() {
    return mode;
  }

  public void setMode(LeadScheduleMode mode) {
    this.mode = mode;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public String getAssignedToUserId() {
    return assignedToUserId;
  }

  public void setAssignedToUserId(String assignedToUserId) {
    this.assignedToUserId = assignedToUserId;
  }

  public String getAssignedToName() {
    return assignedToName;
  }

  public void setAssignedToName(String assignedToName) {
    this.assignedToName = assignedToName;
  }

  public String getCreatedByUserId() {
    return createdByUserId;
  }

  public void setCreatedByUserId(String createdByUserId) {
    this.createdByUserId = createdByUserId;
  }

  public String getCreatedByName() {
    return createdByName;
  }

  public void setCreatedByName(String createdByName) {
    this.createdByName = createdByName;
  }

  public String getUpdatedByUserId() {
    return updatedByUserId;
  }

  public void setUpdatedByUserId(String updatedByUserId) {
    this.updatedByUserId = updatedByUserId;
  }

  public String getUpdatedByName() {
    return updatedByName;
  }

  public void setUpdatedByName(String updatedByName) {
    this.updatedByName = updatedByName;
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
