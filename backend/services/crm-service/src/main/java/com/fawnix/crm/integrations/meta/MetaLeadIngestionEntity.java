package com.fawnix.crm.integrations.meta;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "meta_lead_ingestions")
public class MetaLeadIngestionEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "leadgen_id", length = 64, nullable = false, unique = true)
  private String leadgenId;

  @Column(name = "lead_id", length = 36)
  private String leadId;

  @Column(name = "page_id", length = 64)
  private String pageId;

  @Column(name = "form_id", length = 64)
  private String formId;

  @Column(name = "ad_id", length = 64)
  private String adId;

  @Column(name = "payload", columnDefinition = "text")
  private String payload;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "processed_at")
  private Instant processedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getLeadgenId() {
    return leadgenId;
  }

  public void setLeadgenId(String leadgenId) {
    this.leadgenId = leadgenId;
  }

  public String getLeadId() {
    return leadId;
  }

  public void setLeadId(String leadId) {
    this.leadId = leadId;
  }

  public String getPageId() {
    return pageId;
  }

  public void setPageId(String pageId) {
    this.pageId = pageId;
  }

  public String getFormId() {
    return formId;
  }

  public void setFormId(String formId) {
    this.formId = formId;
  }

  public String getAdId() {
    return adId;
  }

  public void setAdId(String adId) {
    this.adId = adId;
  }

  public String getPayload() {
    return payload;
  }

  public void setPayload(String payload) {
    this.payload = payload;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getProcessedAt() {
    return processedAt;
  }

  public void setProcessedAt(Instant processedAt) {
    this.processedAt = processedAt;
  }
}
