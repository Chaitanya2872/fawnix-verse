package com.hirepath.task.tasks.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "task_activity_logs")
public class TaskActivityLogEntity {

  @Id
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "task_id", nullable = false)
  private TaskEntity task;

  @Enumerated(EnumType.STRING)
  @Column(name = "activity_type", nullable = false, length = 40)
  private TaskActivityType activityType;

  @Column(name = "actor_id", length = 64)
  private String actorId;

  @Column(name = "actor_name", length = 160)
  private String actorName;

  @Column(nullable = false, columnDefinition = "text")
  private String message;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public TaskEntity getTask() { return task; }
  public void setTask(TaskEntity task) { this.task = task; }
  public TaskActivityType getActivityType() { return activityType; }
  public void setActivityType(TaskActivityType activityType) { this.activityType = activityType; }
  public String getActorId() { return actorId; }
  public void setActorId(String actorId) { this.actorId = actorId; }
  public String getActorName() { return actorName; }
  public void setActorName(String actorName) { this.actorName = actorName; }
  public String getMessage() { return message; }
  public void setMessage(String message) { this.message = message; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
