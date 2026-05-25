package com.hirepath.task.tasks.dto;

import com.hirepath.task.tasks.domain.TaskActivityType;
import com.hirepath.task.tasks.domain.TaskApprovalStatus;
import com.hirepath.task.tasks.domain.TaskPriority;
import com.hirepath.task.tasks.domain.TaskRelationshipType;
import com.hirepath.task.tasks.domain.TaskSpaceInvitationStatus;
import com.hirepath.task.tasks.domain.TaskSpaceMemberRole;
import com.hirepath.task.tasks.domain.TaskSpacePermission;
import com.hirepath.task.tasks.domain.TaskSpaceVisibility;
import com.hirepath.task.tasks.domain.TaskStatus;
import com.hirepath.task.tasks.domain.TaskVisibility;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
      @Size(max = 200, message = "Task title must be at most 200 characters.")
      String title,
      String description,
      TaskPriority priority,
      TaskStatus status,
      LocalDate startDate,
      LocalDate dueDate,
      @Size(max = 120, message = "Project reference must be at most 120 characters.")
      String projectRef,
      @Size(max = 120, message = "Module reference must be at most 120 characters.")
      String moduleRef,
      @DecimalMin(value = "0.0", message = "Estimated hours must be at least 0.")
      BigDecimal estimatedHours,
      Boolean approvalRequired,
      TaskApprovalStatus approvalStatus,
      TaskVisibility visibility,
      Integer reminderMinutesBefore,
      @Size(max = 120, message = "Workflow name must be at most 120 characters.")
      String workflowName,
      String spaceId,
      String assignedToId,
      String assignedToName,
      @Size(max = 200, message = "Assignee email must be at most 200 characters.")
      String assignedToEmail,
      @Size(max = 160, message = "Assigned team name must be at most 160 characters.")
      String assignedTeamName,
      String approverId,
      @Size(max = 120, message = "Approver name must be at most 120 characters.")
      String approverName,
      String parentTaskId,
      Long orderIndex,
      @Valid List<AssigneeRefRequest> assignees,
      @Valid List<TagRequest> tags,
      @Valid List<AttachmentRequest> attachments,
      @Valid List<DependencyRequest> dependencies,
      @Valid List<ChecklistItemCreateRequest> checklistItems
  ) {
  }

  public record AssigneeRefRequest(
      @NotBlank(message = "Assignee id is required.")
      String assignedToId,
      @NotBlank(message = "Assignee name is required.")
      String assignedToName,
      @Size(max = 200, message = "Assignee email must be at most 200 characters.")
      String assignedToEmail,
      @Size(max = 160, message = "Assigned team name must be at most 160 characters.")
      String assignedTeamName
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
      String title,
      TaskRelationshipType relationshipType
  ) {
  }

  public record TaskTreeResponse(
      List<TaskSummaryResponse> data
  ) {
  }

  public record ReorderHierarchyRequest(
      String parentTaskId,
      Long orderIndex
  ) {
  }

  public record TaskStatusUpdateRequest(
      @NotNull(message = "Task status is required.")
      TaskStatus status
  ) {
  }

  public record SpaceCreateRequest(
      @NotBlank(message = "Space name is required.")
      String name,
      String description,
      String iconName,
      String colorHex,
      @NotNull(message = "Space visibility is required.")
      TaskSpaceVisibility visibility,
      List<SpaceMemberSeedRequest> members
  ) {
  }

  public record SpaceUpdateRequest(
      String name,
      String description,
      String iconName,
      String colorHex,
      TaskSpaceVisibility visibility,
      Boolean archived
  ) {
  }

  public record SpaceInvitationRequest(
      @NotBlank(message = "Invitee user id is required.")
      String userId,
      @NotBlank(message = "Invitee name is required.")
      String userName,
      String userEmail,
      @NotNull(message = "Member role is required.")
      TaskSpaceMemberRole role,
      List<TaskSpacePermission> permissions,
      String message
  ) {
  }

  public record SpaceInvitationActionRequest(
      @NotNull(message = "Invitation action is required.")
      TaskSpaceInvitationStatus status
  ) {
  }

  public record SpaceMemberUpdateRequest(
      @NotNull(message = "Member role is required.")
      TaskSpaceMemberRole role,
      List<TaskSpacePermission> permissions
  ) {
  }

  public record SpaceMemberSeedRequest(
      @NotBlank(message = "Member user id is required.")
      String userId,
      @NotBlank(message = "Member name is required.")
      String userName,
      String userEmail,
      @NotNull(message = "Member role is required.")
      TaskSpaceMemberRole role,
      List<TaskSpacePermission> permissions
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
      String spaceId,
      String spaceName,
      String projectRef,
      String moduleRef,
      String assignedToId,
      String assignedToName,
      String assignedTeamName,
      List<TaskAssigneeResponse> activeAssignees,
      String parentTaskId,
      int hierarchyLevel,
      String taskPath,
      long orderIndex,
      BigDecimal estimatedHours,
      BigDecimal actualHours,
      List<String> tags,
      int checklistCompleted,
      int checklistTotal,
      int childCount,
      int progressPercent,
      boolean overdue,
      Instant updatedAt,
      boolean canEdit,
      boolean canManageExecution,
      List<TaskSummaryResponse> subtasks
  ) {
  }

  public record TaskAssigneeResponse(
      String assignedToId,
      String assignedToName,
      String assignedToEmail,
      String assignedTeamName
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
      List<TimeLogResponse> timeLogs,
      List<TaskSummaryResponse> subtasks
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
      String title,
      TaskRelationshipType relationshipType
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

  public record SpaceSummaryResponse(
      String id,
      String spaceKey,
      String name,
      String description,
      String iconName,
      String colorHex,
      TaskSpaceVisibility visibility,
      String ownerUserId,
      String ownerUserName,
      TaskSpaceMemberRole currentUserRole,
      boolean archived,
      long pendingCount,
      long inProgressCount,
      long completedCount,
      long overdueCount,
      long memberCount,
      long pendingInvitations,
      Instant updatedAt
  ) {
  }

  public record SpaceMemberResponse(
      String id,
      String userId,
      String userName,
      String userEmail,
      TaskSpaceMemberRole role,
      List<TaskSpacePermission> permissions,
      boolean active,
      String invitedByName,
      Instant joinedAt
  ) {
  }

  public record SpaceInvitationResponse(
      String id,
      String spaceId,
      String spaceName,
      String inviteeUserId,
      String inviteeName,
      String inviteeEmail,
      String invitedById,
      String invitedByName,
      TaskSpaceMemberRole role,
      List<TaskSpacePermission> permissions,
      TaskSpaceInvitationStatus status,
      String message,
      Instant respondedAt,
      Instant createdAt
  ) {
  }

  public record SpaceDetailResponse(
      SpaceSummaryResponse space,
      List<SpaceMemberResponse> members,
      List<SpaceInvitationResponse> invitations
  ) {
  }

  public record TaskStreamEvent(
      String type,
      String spaceId,
      String invitationId,
      Instant occurredAt
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
