package com.fawnix.project.meetings.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "project_meetings")
public class ProjectMeetingEntity {

  @Id
  @Column(nullable = false, length = 36)
  private String id;

  @Column(name = "project_id", length = 36)
  private String projectId;

  @Column(name = "project_name", length = 200)
  private String projectName;

  @Column(name = "project_code", length = 40)
  private String projectCode;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(columnDefinition = "text")
  private String description;

  @Column(name = "meeting_type", length = 60)
  private String meetingType;

  @Column(length = 80)
  private String platform;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 40)
  private ProjectMeetingStatus status;

  @Column(name = "organizer_name", length = 160)
  private String organizerName;

  @Column(name = "organizer_role", length = 120)
  private String organizerRole;

  @Column(name = "start_at", nullable = false)
  private Instant startAt;

  @Column(name = "end_at", nullable = false)
  private Instant endAt;

  @Column(length = 80)
  private String timezone;

  @Column(name = "meeting_link", columnDefinition = "text")
  private String meetingLink;

  @Column(name = "meeting_external_id", length = 120)
  private String meetingExternalId;

  @Column(length = 80)
  private String reminder;

  @Column(name = "repeat_rule", length = 80)
  private String repeatRule;

  @Column(name = "participants_payload", columnDefinition = "text")
  private String participantsPayload;

  @Column(name = "agenda_payload", columnDefinition = "text")
  private String agendaPayload;

  @Column(name = "actions_payload", columnDefinition = "text")
  private String actionsPayload;

  @Column(name = "attachments_payload", columnDefinition = "text")
  private String attachmentsPayload;

  @Column(name = "notes_payload", columnDefinition = "text")
  private String notesPayload;

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

  public String getProjectId() {
    return projectId;
  }

  public void setProjectId(String projectId) {
    this.projectId = projectId;
  }

  public String getProjectName() {
    return projectName;
  }

  public void setProjectName(String projectName) {
    this.projectName = projectName;
  }

  public String getProjectCode() {
    return projectCode;
  }

  public void setProjectCode(String projectCode) {
    this.projectCode = projectCode;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getMeetingType() {
    return meetingType;
  }

  public void setMeetingType(String meetingType) {
    this.meetingType = meetingType;
  }

  public String getPlatform() {
    return platform;
  }

  public void setPlatform(String platform) {
    this.platform = platform;
  }

  public ProjectMeetingStatus getStatus() {
    return status;
  }

  public void setStatus(ProjectMeetingStatus status) {
    this.status = status;
  }

  public String getOrganizerName() {
    return organizerName;
  }

  public void setOrganizerName(String organizerName) {
    this.organizerName = organizerName;
  }

  public String getOrganizerRole() {
    return organizerRole;
  }

  public void setOrganizerRole(String organizerRole) {
    this.organizerRole = organizerRole;
  }

  public Instant getStartAt() {
    return startAt;
  }

  public void setStartAt(Instant startAt) {
    this.startAt = startAt;
  }

  public Instant getEndAt() {
    return endAt;
  }

  public void setEndAt(Instant endAt) {
    this.endAt = endAt;
  }

  public String getTimezone() {
    return timezone;
  }

  public void setTimezone(String timezone) {
    this.timezone = timezone;
  }

  public String getMeetingLink() {
    return meetingLink;
  }

  public void setMeetingLink(String meetingLink) {
    this.meetingLink = meetingLink;
  }

  public String getMeetingExternalId() {
    return meetingExternalId;
  }

  public void setMeetingExternalId(String meetingExternalId) {
    this.meetingExternalId = meetingExternalId;
  }

  public String getReminder() {
    return reminder;
  }

  public void setReminder(String reminder) {
    this.reminder = reminder;
  }

  public String getRepeatRule() {
    return repeatRule;
  }

  public void setRepeatRule(String repeatRule) {
    this.repeatRule = repeatRule;
  }

  public String getParticipantsPayload() {
    return participantsPayload;
  }

  public void setParticipantsPayload(String participantsPayload) {
    this.participantsPayload = participantsPayload;
  }

  public String getAgendaPayload() {
    return agendaPayload;
  }

  public void setAgendaPayload(String agendaPayload) {
    this.agendaPayload = agendaPayload;
  }

  public String getActionsPayload() {
    return actionsPayload;
  }

  public void setActionsPayload(String actionsPayload) {
    this.actionsPayload = actionsPayload;
  }

  public String getAttachmentsPayload() {
    return attachmentsPayload;
  }

  public void setAttachmentsPayload(String attachmentsPayload) {
    this.attachmentsPayload = attachmentsPayload;
  }

  public String getNotesPayload() {
    return notesPayload;
  }

  public void setNotesPayload(String notesPayload) {
    this.notesPayload = notesPayload;
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

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
