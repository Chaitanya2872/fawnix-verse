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
@Table(name = "task_checklists")
public class TaskChecklistItemEntity {

  @Id
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "task_id", nullable = false)
  private TaskEntity task;

  @Column(nullable = false, length = 220)
  private String label;

  @Column(nullable = false)
  private boolean completed;

  @Column(name = "completed_by_id", length = 64)
  private String completedById;

  @Column(name = "completed_by_name", length = 160)
  private String completedByName;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public TaskEntity getTask() { return task; }
  public void setTask(TaskEntity task) { this.task = task; }
  public String getLabel() { return label; }
  public void setLabel(String label) { this.label = label; }
  public boolean isCompleted() { return completed; }
  public void setCompleted(boolean completed) { this.completed = completed; }
  public String getCompletedById() { return completedById; }
  public void setCompletedById(String completedById) { this.completedById = completedById; }
  public String getCompletedByName() { return completedByName; }
  public void setCompletedByName(String completedByName) { this.completedByName = completedByName; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
