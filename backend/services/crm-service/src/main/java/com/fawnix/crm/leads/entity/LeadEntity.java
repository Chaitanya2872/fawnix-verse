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

  @Column(name = "converted_at")
  private Instant convertedAt;

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

  public Instant getConvertedAt() {
    return convertedAt;
  }

  public void setConvertedAt(Instant convertedAt) {
    this.convertedAt = convertedAt;
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
