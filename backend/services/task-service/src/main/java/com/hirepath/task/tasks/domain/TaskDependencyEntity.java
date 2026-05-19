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
@Table(name = "task_dependencies")
public class TaskDependencyEntity {

  @Id
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "task_id", nullable = false)
  private TaskEntity task;

  @Column(name = "depends_on_task_id", nullable = false, length = 64)
  private String dependsOnTaskId;

  @Column(name = "depends_on_task_code", length = 32)
  private String dependsOnTaskCode;

  @Column(name = "depends_on_title", length = 200)
  private String dependsOnTitle;

  @Enumerated(EnumType.STRING)
  @Column(name = "relationship_type", nullable = false, length = 30)
  private TaskRelationshipType relationshipType;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public TaskEntity getTask() { return task; }
  public void setTask(TaskEntity task) { this.task = task; }
  public String getDependsOnTaskId() { return dependsOnTaskId; }
  public void setDependsOnTaskId(String dependsOnTaskId) { this.dependsOnTaskId = dependsOnTaskId; }
  public String getDependsOnTaskCode() { return dependsOnTaskCode; }
  public void setDependsOnTaskCode(String dependsOnTaskCode) { this.dependsOnTaskCode = dependsOnTaskCode; }
  public String getDependsOnTitle() { return dependsOnTitle; }
  public void setDependsOnTitle(String dependsOnTitle) { this.dependsOnTitle = dependsOnTitle; }
  public TaskRelationshipType getRelationshipType() { return relationshipType; }
  public void setRelationshipType(TaskRelationshipType relationshipType) { this.relationshipType = relationshipType; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
