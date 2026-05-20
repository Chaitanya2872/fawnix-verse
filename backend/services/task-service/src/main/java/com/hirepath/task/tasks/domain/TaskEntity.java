package com.hirepath.task.tasks.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tasks")
public class TaskEntity {

  @Id
  private String id;

  @Column(name = "task_code", nullable = false, unique = true, length = 32)
  private String taskCode;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(columnDefinition = "text")
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private TaskPriority priority;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private TaskStatus status;

  @Enumerated(EnumType.STRING)
  @Column(name = "approval_status", nullable = false, length = 30)
  private TaskApprovalStatus approvalStatus;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private TaskVisibility visibility;

  @Column(name = "approval_required", nullable = false)
  private boolean approvalRequired;

  @Column(name = "workflow_name", length = 120)
  private String workflowName;

  @Column(name = "project_ref", length = 120)
  private String projectRef;

  @Column(name = "module_ref", length = 120)
  private String moduleRef;

  @Column(name = "space_id", length = 64)
  private String spaceId;

  @Column(name = "parent_task_id", length = 64)
  private String parentTaskId;

  @Column(name = "hierarchy_level", nullable = false)
  private int hierarchyLevel;

  @Column(name = "task_path", nullable = false, length = 500)
  private String taskPath;

  @Column(name = "order_index", nullable = false)
  private long orderIndex;

  @Column(name = "assigned_by_id", length = 64)
  private String assignedById;

  @Column(name = "assigned_by_name", length = 160)
  private String assignedByName;

  @Column(name = "assigned_to_id", length = 64)
  private String assignedToId;

  @Column(name = "assigned_to_name", length = 160)
  private String assignedToName;

  @Column(name = "assigned_to_email", length = 200)
  private String assignedToEmail;

  @Column(name = "assigned_team_name", length = 160)
  private String assignedTeamName;

  @Column(name = "approver_id", length = 64)
  private String approverId;

  @Column(name = "approver_name", length = 160)
  private String approverName;

  @Column(name = "created_by_id", nullable = false, length = 64)
  private String createdById;

  @Column(name = "created_by_name", nullable = false, length = 160)
  private String createdByName;

  @Column(name = "estimated_hours", precision = 10, scale = 2)
  private BigDecimal estimatedHours;

  @Column(name = "actual_hours", precision = 10, scale = 2)
  private BigDecimal actualHours;

  @Column(name = "reminder_minutes_before")
  private Integer reminderMinutesBefore;

  @Column(name = "start_date")
  private LocalDate startDate;

  @Column(name = "due_date")
  private LocalDate dueDate;

  @Column(name = "completion_date")
  private LocalDate completionDate;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  @OrderBy("createdAt asc")
  private List<TaskChecklistItemEntity> checklistItems = new ArrayList<>();

  @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  @OrderBy("createdAt asc")
  private List<TaskAttachmentEntity> attachments = new ArrayList<>();

  @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  @OrderBy("createdAt asc")
  private List<TaskTagEntity> tags = new ArrayList<>();

  @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  @OrderBy("createdAt asc")
  private List<TaskDependencyEntity> dependencies = new ArrayList<>();

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getTaskCode() {
    return taskCode;
  }

  public void setTaskCode(String taskCode) {
    this.taskCode = taskCode;
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

  public TaskPriority getPriority() {
    return priority;
  }

  public void setPriority(TaskPriority priority) {
    this.priority = priority;
  }

  public TaskStatus getStatus() {
    return status;
  }

  public void setStatus(TaskStatus status) {
    this.status = status;
  }

  public TaskApprovalStatus getApprovalStatus() {
    return approvalStatus;
  }

  public void setApprovalStatus(TaskApprovalStatus approvalStatus) {
    this.approvalStatus = approvalStatus;
  }

  public TaskVisibility getVisibility() {
    return visibility;
  }

  public void setVisibility(TaskVisibility visibility) {
    this.visibility = visibility;
  }

  public boolean isApprovalRequired() {
    return approvalRequired;
  }

  public void setApprovalRequired(boolean approvalRequired) {
    this.approvalRequired = approvalRequired;
  }

  public String getWorkflowName() {
    return workflowName;
  }

  public void setWorkflowName(String workflowName) {
    this.workflowName = workflowName;
  }

  public String getProjectRef() {
    return projectRef;
  }

  public void setProjectRef(String projectRef) {
    this.projectRef = projectRef;
  }

  public String getModuleRef() {
    return moduleRef;
  }

  public void setModuleRef(String moduleRef) {
    this.moduleRef = moduleRef;
  }

  public String getSpaceId() {
    return spaceId;
  }

  public void setSpaceId(String spaceId) {
    this.spaceId = spaceId;
  }

  public String getParentTaskId() {
    return parentTaskId;
  }

  public void setParentTaskId(String parentTaskId) {
    this.parentTaskId = parentTaskId;
  }

  public int getHierarchyLevel() {
    return hierarchyLevel;
  }

  public void setHierarchyLevel(int hierarchyLevel) {
    this.hierarchyLevel = hierarchyLevel;
  }

  public String getTaskPath() {
    return taskPath;
  }

  public void setTaskPath(String taskPath) {
    this.taskPath = taskPath;
  }

  public long getOrderIndex() {
    return orderIndex;
  }

  public void setOrderIndex(long orderIndex) {
    this.orderIndex = orderIndex;
  }

  public String getAssignedById() {
    return assignedById;
  }

  public void setAssignedById(String assignedById) {
    this.assignedById = assignedById;
  }

  public String getAssignedByName() {
    return assignedByName;
  }

  public void setAssignedByName(String assignedByName) {
    this.assignedByName = assignedByName;
  }

  public String getAssignedToId() {
    return assignedToId;
  }

  public void setAssignedToId(String assignedToId) {
    this.assignedToId = assignedToId;
  }

  public String getAssignedToName() {
    return assignedToName;
  }

  public void setAssignedToName(String assignedToName) {
    this.assignedToName = assignedToName;
  }

  public String getAssignedToEmail() {
    return assignedToEmail;
  }

  public void setAssignedToEmail(String assignedToEmail) {
    this.assignedToEmail = assignedToEmail;
  }

  public String getAssignedTeamName() {
    return assignedTeamName;
  }

  public void setAssignedTeamName(String assignedTeamName) {
    this.assignedTeamName = assignedTeamName;
  }

  public String getApproverId() {
    return approverId;
  }

  public void setApproverId(String approverId) {
    this.approverId = approverId;
  }

  public String getApproverName() {
    return approverName;
  }

  public void setApproverName(String approverName) {
    this.approverName = approverName;
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

  public BigDecimal getEstimatedHours() {
    return estimatedHours;
  }

  public void setEstimatedHours(BigDecimal estimatedHours) {
    this.estimatedHours = estimatedHours;
  }

  public BigDecimal getActualHours() {
    return actualHours;
  }

  public void setActualHours(BigDecimal actualHours) {
    this.actualHours = actualHours;
  }

  public Integer getReminderMinutesBefore() {
    return reminderMinutesBefore;
  }

  public void setReminderMinutesBefore(Integer reminderMinutesBefore) {
    this.reminderMinutesBefore = reminderMinutesBefore;
  }

  public LocalDate getStartDate() {
    return startDate;
  }

  public void setStartDate(LocalDate startDate) {
    this.startDate = startDate;
  }

  public LocalDate getDueDate() {
    return dueDate;
  }

  public void setDueDate(LocalDate dueDate) {
    this.dueDate = dueDate;
  }

  public LocalDate getCompletionDate() {
    return completionDate;
  }

  public void setCompletionDate(LocalDate completionDate) {
    this.completionDate = completionDate;
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

  public List<TaskChecklistItemEntity> getChecklistItems() {
    return checklistItems;
  }

  public List<TaskAttachmentEntity> getAttachments() {
    return attachments;
  }

  public List<TaskTagEntity> getTags() {
    return tags;
  }

  public List<TaskDependencyEntity> getDependencies() {
    return dependencies;
  }
}
