package com.hirepath.task.tasks.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "task_assignments")
public class TaskAssignmentEntity {

  @Id
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "task_id", nullable = false)
  private TaskEntity task;

  @Column(name = "assigned_by_id", nullable = false, length = 64)
  private String assignedById;

  @Column(name = "assigned_by_name", nullable = false, length = 160)
  private String assignedByName;

  @Column(name = "assigned_to_id", nullable = false, length = 64)
  private String assignedToId;

  @Column(name = "assigned_to_name", nullable = false, length = 160)
  private String assignedToName;

  @Column(name = "assigned_to_email", length = 200)
  private String assignedToEmail;

  @Column(name = "assigned_team_name", length = 160)
  private String assignedTeamName;

  @Column(nullable = false)
  private boolean active;

  @Column(name = "assigned_at", nullable = false)
  private Instant assignedAt;

  @Column(name = "ended_at")
  private Instant endedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public TaskEntity getTask() { return task; }
  public void setTask(TaskEntity task) { this.task = task; }
  public String getAssignedById() { return assignedById; }
  public void setAssignedById(String assignedById) { this.assignedById = assignedById; }
  public String getAssignedByName() { return assignedByName; }
  public void setAssignedByName(String assignedByName) { this.assignedByName = assignedByName; }
  public String getAssignedToId() { return assignedToId; }
  public void setAssignedToId(String assignedToId) { this.assignedToId = assignedToId; }
  public String getAssignedToName() { return assignedToName; }
  public void setAssignedToName(String assignedToName) { this.assignedToName = assignedToName; }
  public String getAssignedToEmail() { return assignedToEmail; }
  public void setAssignedToEmail(String assignedToEmail) { this.assignedToEmail = assignedToEmail; }
  public String getAssignedTeamName() { return assignedTeamName; }
  public void setAssignedTeamName(String assignedTeamName) { this.assignedTeamName = assignedTeamName; }
  public boolean isActive() { return active; }
  public void setActive(boolean active) { this.active = active; }
  public Instant getAssignedAt() { return assignedAt; }
  public void setAssignedAt(Instant assignedAt) { this.assignedAt = assignedAt; }
  public Instant getEndedAt() { return endedAt; }
  public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }
}
