package com.fawnix.crm.leads.entity;

import com.fawnix.crm.activities.entity.LeadActivityEntity;
import com.fawnix.crm.contact.entity.LeadContactRecordingEntity;
import com.fawnix.crm.remarks.entity.LeadRemarkEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "leads")
public class LeadEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(nullable = false, length = 160)
  private String name;

  @Column(nullable = false, length = 160)
  private String company;

  @Column(length = 160)
  private String email;

  @Column(length = 50)
  private String phone;

  @Column(name = "external_lead_id", length = 120)
  private String externalLeadId;

  @Column(name = "source_month", length = 40)
  private String sourceMonth;

  @Column(name = "source_date", length = 40)
  private String sourceDate;

  @Column(name = "alternative_phone", length = 50)
  private String alternativePhone;

  @Column(name = "project_stage", length = 160)
  private String projectStage;

  @Column(name = "expected_timeline", length = 160)
  private String expectedTimeline;

  @Column(name = "property_type", length = 160)
  private String propertyType;

  @Column(name = "sqft", length = 40)
  private String sqft;

  @Column(name = "community", length = 160)
  private String community;

  @Column(name = "project_location", length = 160)
  private String projectLocation;

  @Column(name = "project_state", length = 160)
  private String projectState;

  @Column(name = "presales_response", length = 160)
  private String presalesResponse;

  @Column(name = "demo_visit", length = 160)
  private String demoVisit;

  @Column(name = "presales_remarks", columnDefinition = "text")
  private String presalesRemarks;

  @Column(name = "ad_set_name", length = 160)
  private String adSetName;

  @Column(name = "campaign_name", length = 160)
  private String campaignName;

  @Column(name = "meta_lead_id", length = 64)
  private String metaLeadId;

  @Column(name = "meta_form_id", length = 64)
  private String metaFormId;

  @Column(name = "meta_ad_id", length = 64)
  private String metaAdId;

  @Column(name = "source_created_at")
  private Instant sourceCreatedAt;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 40)
  private LeadSource source;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 40)
  private LeadStatus status;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 40)
  private LeadPriority priority;

  @Column(name = "assigned_to_user_id", length = 36)
  private String assignedToUserId;

  @Column(name = "assigned_to_name", length = 120)
  private String assignedToName;

  @Column(name = "estimated_value", nullable = false, precision = 14, scale = 2)
  private BigDecimal estimatedValue = BigDecimal.ZERO;

  @Column(nullable = false, columnDefinition = "text")
  private String notes = "";

  @Column(name = "last_contacted_at")
  private Instant lastContactedAt;

  @Column(name = "follow_up_at")
  private Instant followUpAt;

  @Column(name = "follow_up_reminder_sent_at")
  private Instant followUpReminderSentAt;

  @Column(name = "converted_at")
  private Instant convertedAt;

  @Column(name = "whatsapp_questionnaire_sent_at")
  private Instant whatsappQuestionnaireSentAt;

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

  @OneToMany(mappedBy = "lead", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("createdAt ASC")
  private List<LeadTagEntity> tags = new ArrayList<>();

  @OneToMany(mappedBy = "lead", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("updatedAt DESC")
  private List<LeadRemarkEntity> remarks = new ArrayList<>();

  @OneToMany(mappedBy = "lead", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("createdAt DESC")
  private List<LeadActivityEntity> activities = new ArrayList<>();

  @OneToMany(mappedBy = "lead", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("createdAt DESC")
  private List<LeadContactRecordingEntity> contactRecordings = new ArrayList<>();

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getCompany() {
    return company;
  }

  public void setCompany(String company) {
    this.company = company;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getExternalLeadId() {
    return externalLeadId;
  }

  public void setExternalLeadId(String externalLeadId) {
    this.externalLeadId = externalLeadId;
  }

  public String getSourceMonth() {
    return sourceMonth;
  }

  public void setSourceMonth(String sourceMonth) {
    this.sourceMonth = sourceMonth;
  }

  public String getSourceDate() {
    return sourceDate;
  }

  public void setSourceDate(String sourceDate) {
    this.sourceDate = sourceDate;
  }

  public String getAlternativePhone() {
    return alternativePhone;
  }

  public void setAlternativePhone(String alternativePhone) {
    this.alternativePhone = alternativePhone;
  }

  public String getProjectStage() {
    return projectStage;
  }

  public void setProjectStage(String projectStage) {
    this.projectStage = projectStage;
  }

  public String getExpectedTimeline() {
    return expectedTimeline;
  }

  public void setExpectedTimeline(String expectedTimeline) {
    this.expectedTimeline = expectedTimeline;
  }

  public String getPropertyType() {
    return propertyType;
  }

  public void setPropertyType(String propertyType) {
    this.propertyType = propertyType;
  }

  public String getSqft() {
    return sqft;
  }

  public void setSqft(String sqft) {
    this.sqft = sqft;
  }

  public String getCommunity() {
    return community;
  }

  public void setCommunity(String community) {
    this.community = community;
  }

  public String getProjectLocation() {
    return projectLocation;
  }

  public void setProjectLocation(String projectLocation) {
    this.projectLocation = projectLocation;
  }

  public String getProjectState() {
    return projectState;
  }

  public void setProjectState(String projectState) {
    this.projectState = projectState;
  }

  public String getPresalesResponse() {
    return presalesResponse;
  }

  public void setPresalesResponse(String presalesResponse) {
    this.presalesResponse = presalesResponse;
  }

  public String getDemoVisit() {
    return demoVisit;
  }

  public void setDemoVisit(String demoVisit) {
    this.demoVisit = demoVisit;
  }

  public String getPresalesRemarks() {
    return presalesRemarks;
  }

  public void setPresalesRemarks(String presalesRemarks) {
    this.presalesRemarks = presalesRemarks;
  }

  public String getAdSetName() {
    return adSetName;
  }

  public void setAdSetName(String adSetName) {
    this.adSetName = adSetName;
  }

  public String getCampaignName() {
    return campaignName;
  }

  public void setCampaignName(String campaignName) {
    this.campaignName = campaignName;
  }

  public String getMetaLeadId() {
    return metaLeadId;
  }

  public void setMetaLeadId(String metaLeadId) {
    this.metaLeadId = metaLeadId;
  }

  public String getMetaFormId() {
    return metaFormId;
  }

  public void setMetaFormId(String metaFormId) {
    this.metaFormId = metaFormId;
  }

  public String getMetaAdId() {
    return metaAdId;
  }

  public void setMetaAdId(String metaAdId) {
    this.metaAdId = metaAdId;
  }

  public Instant getSourceCreatedAt() {
    return sourceCreatedAt;
  }

  public void setSourceCreatedAt(Instant sourceCreatedAt) {
    this.sourceCreatedAt = sourceCreatedAt;
  }

  public LeadSource getSource() {
    return source;
  }

  public void setSource(LeadSource source) {
    this.source = source;
  }

  public LeadStatus getStatus() {
    return status;
  }

  public void setStatus(LeadStatus status) {
    this.status = status;
  }

  public LeadPriority getPriority() {
    return priority;
  }

  public void setPriority(LeadPriority priority) {
    this.priority = priority;
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

  public BigDecimal getEstimatedValue() {
    return estimatedValue;
  }

  public void setEstimatedValue(BigDecimal estimatedValue) {
    this.estimatedValue = estimatedValue;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public Instant getLastContactedAt() {
    return lastContactedAt;
  }

  public void setLastContactedAt(Instant lastContactedAt) {
    this.lastContactedAt = lastContactedAt;
  }

  public Instant getFollowUpAt() {
    return followUpAt;
  }

  public void setFollowUpAt(Instant followUpAt) {
    this.followUpAt = followUpAt;
  }

  public Instant getFollowUpReminderSentAt() {
    return followUpReminderSentAt;
  }

  public void setFollowUpReminderSentAt(Instant followUpReminderSentAt) {
    this.followUpReminderSentAt = followUpReminderSentAt;
  }

  public Instant getConvertedAt() {
    return convertedAt;
  }

  public void setConvertedAt(Instant convertedAt) {
    this.convertedAt = convertedAt;
  }

  public Instant getWhatsappQuestionnaireSentAt() {
    return whatsappQuestionnaireSentAt;
  }

  public void setWhatsappQuestionnaireSentAt(Instant whatsappQuestionnaireSentAt) {
    this.whatsappQuestionnaireSentAt = whatsappQuestionnaireSentAt;
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

  public List<LeadTagEntity> getTags() {
    return tags;
  }

  public List<LeadRemarkEntity> getRemarks() {
    return remarks;
  }

  public List<LeadActivityEntity> getActivities() {
    return activities;
  }

  public List<LeadContactRecordingEntity> getContactRecordings() {
    return contactRecordings;
  }
}
