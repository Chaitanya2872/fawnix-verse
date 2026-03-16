package com.fawnix.verse.remarks.entity;

import com.fawnix.verse.leads.entity.LeadEntity;
import com.fawnix.verse.users.entity.UserEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "lead_remarks")
public class LeadRemarkEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "lead_id", nullable = false)
  private LeadEntity lead;

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

  @OneToMany(mappedBy = "remark", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("createdAt ASC")
  private List<LeadRemarkVersionEntity> versions = new ArrayList<>();

  public LeadRemarkEntity() {
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

  public List<LeadRemarkVersionEntity> getVersions() {
    return versions;
  }

  public void setVersions(List<LeadRemarkVersionEntity> versions) {
    this.versions = versions;
  }
}
