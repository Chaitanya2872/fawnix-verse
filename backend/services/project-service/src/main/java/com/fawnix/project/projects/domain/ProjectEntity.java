package com.fawnix.project.projects.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "projects")
public class ProjectEntity {

  @Id
  @Column(nullable = false, length = 36)
  private String id;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(name = "project_code", length = 40)
  private String projectCode;

  @Column(columnDefinition = "text")
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 40)
  private ProjectStatus status;

  @Column(length = 80)
  private String department;

  @Column(name = "manager_name", length = 160)
  private String managerName;

  @Column(name = "team_lead_name", length = 160)
  private String teamLeadName;

  @Column(name = "priority_level", length = 40)
  private String priorityLevel;

  @Column(name = "progress_percent")
  private Integer progressPercent;

  @Column(name = "team_size")
  private Integer teamSize;

  @Column(name = "team_members_payload", columnDefinition = "text")
  private String teamMembersPayload;

  @Column(name = "team_payload", columnDefinition = "text")
  private String teamPayload;

  @Column(name = "details_payload", columnDefinition = "text")
  private String detailsPayload;

  @Column(name = "start_date")
  private LocalDate startDate;

  @Column(name = "target_end_date")
  private LocalDate targetEndDate;

  @Column(name = "created_by_id", length = 120)
  private String createdById;

  @Column(name = "created_by_name", length = 160)
  private String createdByName;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @PrePersist
  public void prePersist() {
    if (id == null || id.isBlank()) {
      id = UUID.randomUUID().toString();
    }
    Instant now = Instant.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  public void preUpdate() {
    updatedAt = Instant.now();
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

  public String getDescription() {
    return description;
  }

  public String getProjectCode() {
    return projectCode;
  }

  public void setProjectCode(String projectCode) {
    this.projectCode = projectCode;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public ProjectStatus getStatus() {
    return status;
  }

  public void setStatus(ProjectStatus status) {
    this.status = status;
  }

  public String getDepartment() {
    return department;
  }

  public void setDepartment(String department) {
    this.department = department;
  }

  public String getManagerName() {
    return managerName;
  }

  public void setManagerName(String managerName) {
    this.managerName = managerName;
  }

  public String getTeamLeadName() {
    return teamLeadName;
  }

  public void setTeamLeadName(String teamLeadName) {
    this.teamLeadName = teamLeadName;
  }

  public String getPriorityLevel() {
    return priorityLevel;
  }

  public void setPriorityLevel(String priorityLevel) {
    this.priorityLevel = priorityLevel;
  }

  public Integer getProgressPercent() {
    return progressPercent;
  }

  public void setProgressPercent(Integer progressPercent) {
    this.progressPercent = progressPercent;
  }

  public Integer getTeamSize() {
    return teamSize;
  }

  public void setTeamSize(Integer teamSize) {
    this.teamSize = teamSize;
  }

  public String getTeamMembersPayload() {
    return teamMembersPayload;
  }

  public void setTeamMembersPayload(String teamMembersPayload) {
    this.teamMembersPayload = teamMembersPayload;
  }

  public String getTeamPayload() {
    return teamPayload;
  }

  public void setTeamPayload(String teamPayload) {
    this.teamPayload = teamPayload;
  }

  public String getDetailsPayload() {
    return detailsPayload;
  }

  public void setDetailsPayload(String detailsPayload) {
    this.detailsPayload = detailsPayload;
  }

  public LocalDate getStartDate() {
    return startDate;
  }

  public void setStartDate(LocalDate startDate) {
    this.startDate = startDate;
  }

  public LocalDate getTargetEndDate() {
    return targetEndDate;
  }

  public void setTargetEndDate(LocalDate targetEndDate) {
    this.targetEndDate = targetEndDate;
  }

  public String getCreatedById() {
    return createdById;
  }

  public void setCreatedById(String createdById) {
    this.createdById = createdById;
  }

  public String getCreatedByName() {
    return createdByName;
  }

  public void setCreatedByName(String createdByName) {
    this.createdByName = createdByName;
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
