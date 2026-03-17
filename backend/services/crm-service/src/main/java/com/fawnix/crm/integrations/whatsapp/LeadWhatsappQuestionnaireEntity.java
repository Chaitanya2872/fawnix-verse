package com.fawnix.crm.integrations.whatsapp;

import com.fawnix.crm.leads.entity.LeadEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "lead_whatsapp_questionnaires")
public class LeadWhatsappQuestionnaireEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @OneToOne
  @JoinColumn(name = "lead_id", nullable = false)
  private LeadEntity lead;

  @Column(length = 40, nullable = false)
  private String phone;

  @Column(name = "wa_id", length = 32)
  private String waId;

  @Column(length = 20)
  private String language;

  @Column(name = "interest_areas", columnDefinition = "text")
  private String interestAreas;

  @Column(name = "demo_preference", length = 40)
  private String demoPreference;

  @Column(name = "callback_preference", length = 40)
  private String callbackPreference;

  @Column(name = "callback_time_text", length = 120)
  private String callbackTimeText;

  @Column(name = "ownership_role", length = 40)
  private String ownershipRole;

  @Column(length = 40, nullable = false)
  private String step;

  @Column(name = "last_message_id", length = 64)
  private String lastMessageId;

  @Column(name = "last_payload", columnDefinition = "text")
  private String lastPayload;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "completed_at")
  private Instant completedAt;

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

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getWaId() {
    return waId;
  }

  public void setWaId(String waId) {
    this.waId = waId;
  }

  public String getLanguage() {
    return language;
  }

  public void setLanguage(String language) {
    this.language = language;
  }

  public String getInterestAreas() {
    return interestAreas;
  }

  public void setInterestAreas(String interestAreas) {
    this.interestAreas = interestAreas;
  }

  public String getDemoPreference() {
    return demoPreference;
  }

  public void setDemoPreference(String demoPreference) {
    this.demoPreference = demoPreference;
  }

  public String getCallbackPreference() {
    return callbackPreference;
  }

  public void setCallbackPreference(String callbackPreference) {
    this.callbackPreference = callbackPreference;
  }

  public String getCallbackTimeText() {
    return callbackTimeText;
  }

  public void setCallbackTimeText(String callbackTimeText) {
    this.callbackTimeText = callbackTimeText;
  }

  public String getOwnershipRole() {
    return ownershipRole;
  }

  public void setOwnershipRole(String ownershipRole) {
    this.ownershipRole = ownershipRole;
  }

  public String getStep() {
    return step;
  }

  public void setStep(String step) {
    this.step = step;
  }

  public String getLastMessageId() {
    return lastMessageId;
  }

  public void setLastMessageId(String lastMessageId) {
    this.lastMessageId = lastMessageId;
  }

  public String getLastPayload() {
    return lastPayload;
  }

  public void setLastPayload(String lastPayload) {
    this.lastPayload = lastPayload;
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

  public Instant getCompletedAt() {
    return completedAt;
  }

  public void setCompletedAt(Instant completedAt) {
    this.completedAt = completedAt;
  }
}
