package com.fawnix.crm.leads.entity;

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
@Table(name = "lead_status_history")
public class LeadStatusHistoryEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "lead_id", nullable = false)
  private LeadEntity lead;

  @Enumerated(EnumType.STRING)
  @Column(name = "from_status", length = 40)
  private LeadStatus fromStatus;

  @Enumerated(EnumType.STRING)
  @Column(name = "to_status", nullable = false, length = 40)
  private LeadStatus toStatus;

  @Column(name = "changed_by_user_id", length = 36)
  private String changedByUserId;

  @Column(name = "changed_by_name", length = 120)
  private String changedByName;

  @Column(name = "note", columnDefinition = "text")
  private String note;

  @Column(name = "changed_at", nullable = false)
  private Instant changedAt;

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

  public LeadStatus getFromStatus() {
    return fromStatus;
  }

  public void setFromStatus(LeadStatus fromStatus) {
    this.fromStatus = fromStatus;
  }

  public LeadStatus getToStatus() {
    return toStatus;
  }

  public void setToStatus(LeadStatus toStatus) {
    this.toStatus = toStatus;
  }

  public String getChangedByUserId() {
    return changedByUserId;
  }

  public void setChangedByUserId(String changedByUserId) {
    this.changedByUserId = changedByUserId;
  }

  public String getChangedByName() {
    return changedByName;
  }

  public void setChangedByName(String changedByName) {
    this.changedByName = changedByName;
  }

  public String getNote() {
    return note;
  }

  public void setNote(String note) {
    this.note = note;
  }

  public Instant getChangedAt() {
    return changedAt;
  }

  public void setChangedAt(Instant changedAt) {
    this.changedAt = changedAt;
  }
}
