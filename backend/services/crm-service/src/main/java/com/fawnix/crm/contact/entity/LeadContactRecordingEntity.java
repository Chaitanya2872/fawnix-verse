package com.fawnix.crm.contact.entity;

import com.fawnix.crm.leads.entity.LeadEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "lead_contact_recordings")
public class LeadContactRecordingEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "lead_id", nullable = false)
  private LeadEntity lead;

  @Column(name = "audio_file_name", nullable = false, length = 255)
  private String audioFileName;

  @Column(name = "audio_content_type", length = 120)
  private String audioContentType;

  @Column(name = "audio_size", nullable = false)
  private long audioSize;

  @Column(name = "audio_storage_path", nullable = false, length = 500)
  private String audioStoragePath;

  @Column(name = "transcript", nullable = false, columnDefinition = "text")
  private String transcript;

  @Column(name = "remarks_summary", nullable = false, columnDefinition = "text")
  private String remarksSummary;

  @Column(name = "conversation_summary", columnDefinition = "text")
  private String conversationSummary;

  @Column(name = "created_by_user_id", length = 36)
  private String createdByUserId;

  @Column(name = "created_by_name", length = 120)
  private String createdByName;

  @Column(name = "contacted_at", nullable = false)
  private Instant contactedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

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

  public String getAudioFileName() {
    return audioFileName;
  }

  public void setAudioFileName(String audioFileName) {
    this.audioFileName = audioFileName;
  }

  public String getAudioContentType() {
    return audioContentType;
  }

  public void setAudioContentType(String audioContentType) {
    this.audioContentType = audioContentType;
  }

  public long getAudioSize() {
    return audioSize;
  }

  public void setAudioSize(long audioSize) {
    this.audioSize = audioSize;
  }

  public String getAudioStoragePath() {
    return audioStoragePath;
  }

  public void setAudioStoragePath(String audioStoragePath) {
    this.audioStoragePath = audioStoragePath;
  }

  public String getTranscript() {
    return transcript;
  }

  public void setTranscript(String transcript) {
    this.transcript = transcript;
  }

  public String getRemarksSummary() {
    return remarksSummary;
  }

  public void setRemarksSummary(String remarksSummary) {
    this.remarksSummary = remarksSummary;
  }

  public String getConversationSummary() {
    return conversationSummary;
  }

  public void setConversationSummary(String conversationSummary) {
    this.conversationSummary = conversationSummary;
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

  public Instant getContactedAt() {
    return contactedAt;
  }

  public void setContactedAt(Instant contactedAt) {
    this.contactedAt = contactedAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
