package com.hirepath.task.tasks.dto;

import com.hirepath.task.tasks.domain.TaskActivityType;
import com.hirepath.task.tasks.domain.TaskApprovalStatus;
import com.hirepath.task.tasks.domain.TaskPriority;
import com.hirepath.task.tasks.domain.TaskStatus;
import com.hirepath.task.tasks.domain.TaskVisibility;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class TaskDtos {

  private TaskDtos() {
  }

  public record TaskRequest(
      @NotBlank(message = "Task title is required.")
      String title,
      String description,
      TaskPriority priority,
      TaskStatus status,
      LocalDate startDate,
      LocalDate dueDate,
      String projectRef,
      String moduleRef,
      @DecimalMin(value = "0.0", message = "Estimated hours must be at least 0.")
      BigDecimal estimatedHours,
      Boolean approvalRequired,
      TaskApprovalStatus approvalStatus,
      TaskVisibility visibility,
      Integer reminderMinutesBefore,
      String workflowName,
      String assignedToId,
      String assignedToName,
      String assignedToEmail,
      String assignedTeamName,
      String approverId,
      String approverName,
      @Valid List<TagRequest> tags,
      @Valid List<AttachmentRequest> attachments,
      @Valid List<DependencyRequest> dependencies,
      @Valid List<ChecklistItemCreateRequest> checklistItems
  ) {
  }

  public record TagRequest(
      @NotBlank(message = "Tag name is required.")
      String name
  ) {
  }

  public record AttachmentRequest(
      @NotBlank(message = "Attachment file name is required.")
      String fileName,
      @NotBlank(message = "Attachment URL is required.")
      String fileUrl,
      String contentType,
      Long fileSize
  ) {
  }

  public record DependencyRequest(
      @NotBlank(message = "Dependency task id is required.")
      String taskId,
      String taskCode,
      String title
  ) {
  }

  public record CommentCreateRequest(
      @NotBlank(message = "Comment is required.")
      String message
  ) {
  }

  public record ChecklistItemCreateRequest(
      @NotBlank(message = "Checklist label is required.")
      String label
  ) {
  }

  public record ChecklistItemUpdateRequest(
      @NotBlank(message = "Checklist label is required.")
      String label,
      @NotNull(message = "Checklist completion state is required.")
      Boolean completed
  ) {
  }

  public record AssignmentRequest(
      @NotBlank(message = "Assignee id is required.")
      String assignedToId,
      @NotBlank(message = "Assignee name is required.")
      String assignedToName,
      String assignedToEmail,
      String assignedTeamName,
      Boolean preventDuplicateActiveAssignments
  ) {
  }

  public record ApprovalActionRequest(
      String comment,
      Boolean reworkRequested
  ) {
  }

  public record StopTimerRequest(
      Instant startedAt,
      Instant endedAt,
      String note
  ) {
  }

  public record TaskListResponse(
      List<TaskSummaryResponse> data,
      long total,
      int page,
      int pageSize,
      int totalPages
  ) {
  }

  public record TaskSummaryResponse(
      String id,
      String taskCode,
      String title,
      String description,
      TaskPriority priority,
      TaskStatus status,
      TaskApprovalStatus approvalStatus,
      TaskVisibility visibility,
      LocalDate startDate,
      LocalDate dueDate,
      LocalDate completionDate,
      String projectRef,
      String moduleRef,
      String assignedToId,
      String assignedToName,
      String assignedTeamName,
      BigDecimal estimatedHours,
      BigDecimal actualHours,
      List<String> tags,
      int checklistCompleted,
      int checklistTotal,
      boolean overdue,
      Instant updatedAt
  ) {
  }

  public record TaskDetailResponse(
      TaskSummaryResponse task,
      List<CommentResponse> comments,
      List<ChecklistItemResponse> checklistItems,
      List<AttachmentResponse> attachments,
      List<DependencyResponse> dependencies,
      List<AssignmentHistoryResponse> assignments,
      List<ActivityResponse> activity,
      List<TimeLogResponse> timeLogs
  ) {
  }

  public record CommentResponse(
      String id,
      String authorId,
      String authorName,
      String message,
      Instant createdAt
  ) {
  }

  public record ChecklistItemResponse(
      String id,
      String label,
      boolean completed,
      String completedById,
      String completedByName,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record AttachmentResponse(
      String id,
      String fileName,
      String fileUrl,
      String contentType,
      Long fileSize,
      String uploadedByName,
      Instant createdAt
  ) {
  }

  public record DependencyResponse(
      String id,
      String taskId,
      String taskCode,
      String title
  ) {
  }

  public record AssignmentHistoryResponse(
      String id,
      String assignedById,
      String assignedByName,
      String assignedToId,
      String assignedToName,
      String assignedToEmail,
      String assignedTeamName,
      boolean active,
      Instant assignedAt,
      Instant endedAt
  ) {
  }

  public record ActivityResponse(
      String id,
      TaskActivityType activityType,
      String actorId,
      String actorName,
      String message,
      Instant createdAt
  ) {
  }

  public record TimeLogResponse(
      String id,
      String userId,
      String userName,
      Instant startedAt,
      Instant endedAt,
      BigDecimal durationHours,
      String note,
      Instant createdAt
  ) {
  }

  public record DashboardResponse(
      Map<String, Long> kpis,
      Map<String, Long> statusDistribution,
      List<ActivityResponse> recentActivity,
      List<UpcomingDeadlineResponse> upcomingDeadlines,
      List<WorkloadResponse> workload,
      AssignedCompletedMetricsResponse assignmentMetrics
  ) {
  }

  public record UpcomingDeadlineResponse(
      String id,
      String taskCode,
      String title,
      LocalDate dueDate,
      TaskPriority priority,
      TaskStatus status,
      String assignedToName
  ) {
  }

  public record WorkloadResponse(
      String assigneeId,
      String assigneeName,
      long assigned,
      long completed,
      long overdue,
      BigDecimal loggedHours
  ) {
  }

  public record AssignedCompletedMetricsResponse(
      long assigned,
      long completed
  ) {
  }
}
