package com.fawnix.verse.leads.entity;

import com.fawnix.verse.activities.entity.LeadActivityEntity;
import com.fawnix.verse.remarks.entity.LeadRemarkEntity;
import com.fawnix.verse.users.entity.UserEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "assigned_to_user_id")
  private UserEntity assignedToUser;

  @Column(name = "estimated_value", nullable = false, precision = 14, scale = 2)
  private BigDecimal estimatedValue = BigDecimal.ZERO;

  @Column(nullable = false, columnDefinition = "text")
  private String notes = "";

  @Column(name = "last_contacted_at")
  private Instant lastContactedAt;

  @Column(name = "converted_at")
  private Instant convertedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_by_user_id")
  private UserEntity createdByUser;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "updated_by_user_id")
  private UserEntity updatedByUser;

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

  public LeadEntity() {
  }

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

  public UserEntity getAssignedToUser() {
    return assignedToUser;
  }

  public void setAssignedToUser(UserEntity assignedToUser) {
    this.assignedToUser = assignedToUser;
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

  public UserEntity getCreatedByUser() {
    return createdByUser;
  }

  public void setCreatedByUser(UserEntity createdByUser) {
    this.createdByUser = createdByUser;
  }

  public UserEntity getUpdatedByUser() {
    return updatedByUser;
  }

  public void setUpdatedByUser(UserEntity updatedByUser) {
    this.updatedByUser = updatedByUser;
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

  public void setTags(List<LeadTagEntity> tags) {
    this.tags = tags;
  }

  public List<LeadRemarkEntity> getRemarks() {
    return remarks;
  }

  public void setRemarks(List<LeadRemarkEntity> remarks) {
    this.remarks = remarks;
  }

  public List<LeadActivityEntity> getActivities() {
    return activities;
  }

  public void setActivities(List<LeadActivityEntity> activities) {
    this.activities = activities;
  }
}
