package com.hirepath.task.tasks.service;

import com.hirepath.task.common.exception.BadRequestException;
import com.hirepath.task.common.exception.ForbiddenOperationException;
import com.hirepath.task.common.exception.ResourceNotFoundException;
import com.hirepath.task.security.service.AppUserDetails;
import com.hirepath.task.tasks.domain.TaskActivityLogEntity;
import com.hirepath.task.tasks.domain.TaskActivityType;
import com.hirepath.task.tasks.domain.TaskApprovalStatus;
import com.hirepath.task.tasks.domain.TaskAssignmentEntity;
import com.hirepath.task.tasks.domain.TaskAttachmentEntity;
import com.hirepath.task.tasks.domain.TaskChecklistItemEntity;
import com.hirepath.task.tasks.domain.TaskCommentEntity;
import com.hirepath.task.tasks.domain.TaskDependencyEntity;
import com.hirepath.task.tasks.domain.TaskEntity;
import com.hirepath.task.tasks.domain.TaskPriority;
import com.hirepath.task.tasks.domain.TaskStatus;
import com.hirepath.task.tasks.domain.TaskTagEntity;
import com.hirepath.task.tasks.domain.TaskTimeLogEntity;
import com.hirepath.task.tasks.domain.TaskVisibility;
import com.hirepath.task.tasks.dto.TaskDtos;
import com.hirepath.task.tasks.repository.TaskActivityLogRepository;
import com.hirepath.task.tasks.repository.TaskAssignmentRepository;
import com.hirepath.task.tasks.repository.TaskChecklistRepository;
import com.hirepath.task.tasks.repository.TaskCommentRepository;
import com.hirepath.task.tasks.repository.TaskRepository;
import com.hirepath.task.tasks.repository.TaskTimeLogRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class TaskService {

  private static final List<String> PRIVILEGED_ROLES = List.of(
      "ROLE_MASTER",
      "ROLE_ADMIN",
      "ROLE_REPORTING_MANAGER",
      "ROLE_SALES_MANAGER",
      "ROLE_HR_MANAGER",
      "ROLE_HIRING_MANAGER",
      "ROLE_TEAM_LEAD"
  );

  private final TaskRepository taskRepository;
  private final TaskCommentRepository commentRepository;
  private final TaskChecklistRepository checklistRepository;
  private final TaskAssignmentRepository assignmentRepository;
  private final TaskActivityLogRepository activityRepository;
  private final TaskTimeLogRepository timeLogRepository;

  public TaskService(
      TaskRepository taskRepository,
      TaskCommentRepository commentRepository,
      TaskChecklistRepository checklistRepository,
      TaskAssignmentRepository assignmentRepository,
      TaskActivityLogRepository activityRepository,
      TaskTimeLogRepository timeLogRepository
  ) {
    this.taskRepository = taskRepository;
    this.commentRepository = commentRepository;
    this.checklistRepository = checklistRepository;
    this.assignmentRepository = assignmentRepository;
    this.activityRepository = activityRepository;
    this.timeLogRepository = timeLogRepository;
  }

  public TaskDtos.TaskDetailResponse createTask(TaskDtos.TaskRequest request, AppUserDetails user) {
    validateTaskDates(request.startDate(), request.dueDate());
    Instant now = Instant.now();

    TaskEntity task = new TaskEntity();
    task.setId(UUID.randomUUID().toString());
    task.setTaskCode(nextTaskCode());
    task.setTitle(request.title().trim());
    task.setDescription(trimToNull(request.description()));
    task.setPriority(request.priority() == null ? TaskPriority.MEDIUM : request.priority());
    task.setStatus(request.status() == null ? TaskStatus.PENDING : request.status());
    task.setApprovalRequired(Boolean.TRUE.equals(request.approvalRequired()));
    task.setApprovalStatus(resolveApprovalStatus(request, false, TaskApprovalStatus.NOT_REQUIRED));
    task.setVisibility(request.visibility() == null ? TaskVisibility.TEAM : request.visibility());
    task.setWorkflowName(trimToNull(request.workflowName()));
    task.setProjectRef(trimToNull(request.projectRef()));
    task.setModuleRef(trimToNull(request.moduleRef()));
    task.setAssignedById(user.getUserId());
    task.setAssignedByName(user.getFullName());
    task.setAssignedToId(trimToNull(request.assignedToId()));
    task.setAssignedToName(trimToNull(request.assignedToName()));
    task.setAssignedToEmail(trimToNull(request.assignedToEmail()));
    task.setAssignedTeamName(trimToNull(request.assignedTeamName()));
    task.setApproverId(trimToNull(request.approverId()));
    task.setApproverName(trimToNull(request.approverName()));
    task.setCreatedById(user.getUserId());
    task.setCreatedByName(user.getFullName());
    task.setEstimatedHours(defaultBigDecimal(request.estimatedHours()));
    task.setActualHours(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
    task.setReminderMinutesBefore(request.reminderMinutesBefore());
    task.setStartDate(request.startDate());
    task.setDueDate(request.dueDate());
    task.setCompletionDate(resolveCompletionDate(task.getStatus(), null));
    task.setCreatedAt(now);
    task.setUpdatedAt(now);
    syncChildCollections(task, request, user, now);

    taskRepository.save(task);
    if (StringUtils.hasText(task.getAssignedToId())) {
      saveAssignment(task, user, task.getAssignedToId(), task.getAssignedToName(), task.getAssignedToEmail(), task.getAssignedTeamName(), true, now);
    }
    logActivity(task, TaskActivityType.CREATED, user, "Task created.");
    return getTask(task.getId(), user);
  }

  public TaskDtos.TaskListResponse listTasks(
      String search,
      String status,
      String priority,
      String scope,
      String assigneeId,
      String projectRef,
      String moduleRef,
      String approvalStatus,
      Boolean overdue,
      Boolean dueToday,
      int page,
      int pageSize,
      AppUserDetails user
  ) {
    int normalizedPage = Math.max(page, 1);
    int normalizedSize = Math.max(1, Math.min(pageSize, 100));

    Predicate<TaskEntity> predicate = buildPredicate(search, status, priority, scope, assigneeId, projectRef, moduleRef, approvalStatus, overdue, dueToday, user);
    List<TaskEntity> visible = taskRepository.findAll().stream()
        .filter(task -> canView(user, task))
        .filter(predicate)
        .sorted(Comparator.comparing(TaskEntity::getUpdatedAt).reversed())
        .toList();

    int fromIndex = Math.min((normalizedPage - 1) * normalizedSize, visible.size());
    int toIndex = Math.min(fromIndex + normalizedSize, visible.size());
    List<TaskDtos.TaskSummaryResponse> data = visible.subList(fromIndex, toIndex).stream()
        .map(this::toSummary)
        .toList();

    int totalPages = visible.isEmpty() ? 1 : (int) Math.ceil((double) visible.size() / normalizedSize);
    return new TaskDtos.TaskListResponse(data, visible.size(), normalizedPage, normalizedSize, totalPages);
  }

  public TaskDtos.TaskDetailResponse getTask(String id, AppUserDetails user) {
    TaskEntity task = requireTask(id);
    ensureViewAccess(user, task);
    return toDetail(task);
  }

  public TaskDtos.TaskDetailResponse updateTask(String id, TaskDtos.TaskRequest request, AppUserDetails user) {
    TaskEntity task = requireTask(id);
    ensureEditAccess(user, task);
    validateTaskDates(request.startDate(), request.dueDate());

    TaskStatus previousStatus = task.getStatus();
    TaskPriority previousPriority = task.getPriority();
    String previousAssignee = task.getAssignedToId();

    task.setTitle(request.title().trim());
    if (request.description() != null) task.setDescription(trimToNull(request.description()));
    task.setPriority(request.priority() == null ? task.getPriority() : request.priority());
    task.setStatus(request.status() == null ? task.getStatus() : request.status());
    if (request.approvalRequired() != null) task.setApprovalRequired(Boolean.TRUE.equals(request.approvalRequired()));
    if (request.approvalRequired() != null || request.approvalStatus() != null) {
      task.setApprovalStatus(resolveApprovalStatus(request, task.isApprovalRequired(), task.getApprovalStatus()));
    }
    task.setVisibility(request.visibility() == null ? task.getVisibility() : request.visibility());
    if (request.workflowName() != null) task.setWorkflowName(trimToNull(request.workflowName()));
    if (request.projectRef() != null) task.setProjectRef(trimToNull(request.projectRef()));
    if (request.moduleRef() != null) task.setModuleRef(trimToNull(request.moduleRef()));
    if (request.assignedToId() != null) task.setAssignedToId(trimToNull(request.assignedToId()));
    if (request.assignedToName() != null) task.setAssignedToName(trimToNull(request.assignedToName()));
    if (request.assignedToEmail() != null) task.setAssignedToEmail(trimToNull(request.assignedToEmail()));
    if (request.assignedTeamName() != null) task.setAssignedTeamName(trimToNull(request.assignedTeamName()));
    if (request.approverId() != null) task.setApproverId(trimToNull(request.approverId()));
    if (request.approverName() != null) task.setApproverName(trimToNull(request.approverName()));
    if (request.estimatedHours() != null) task.setEstimatedHours(defaultBigDecimal(request.estimatedHours()));
    if (request.reminderMinutesBefore() != null) task.setReminderMinutesBefore(request.reminderMinutesBefore());
    if (request.startDate() != null || task.getStartDate() == null) task.setStartDate(request.startDate());
    if (request.dueDate() != null || task.getDueDate() == null) task.setDueDate(request.dueDate());
    task.setCompletionDate(resolveCompletionDate(task.getStatus(), task.getCompletionDate()));
    task.setUpdatedAt(Instant.now());
    syncChildCollections(task, request, user, Instant.now());
    taskRepository.save(task);

    if (previousStatus != task.getStatus()) {
      logActivity(task, TaskActivityType.STATUS_CHANGED, user, "Status changed to " + readable(task.getStatus().name()) + ".");
    }
    if (previousPriority != task.getPriority()) {
      logActivity(task, TaskActivityType.PRIORITY_CHANGED, user, "Priority changed to " + readable(task.getPriority().name()) + ".");
    }
    if (!equalsNullable(previousAssignee, task.getAssignedToId()) && StringUtils.hasText(task.getAssignedToId())) {
      reassignInternal(task, user, new TaskDtos.AssignmentRequest(
          task.getAssignedToId(),
          task.getAssignedToName(),
          task.getAssignedToEmail(),
          task.getAssignedTeamName(),
          true
      ), true);
    } else {
      logActivity(task, TaskActivityType.UPDATED, user, "Task updated.");
    }

    return getTask(id, user);
  }

  public void deleteTask(String id, AppUserDetails user) {
    TaskEntity task = requireTask(id);
    ensureEditAccess(user, task);
    taskRepository.delete(task);
  }

  public TaskDtos.CommentResponse addComment(String taskId, TaskDtos.CommentCreateRequest request, AppUserDetails user) {
    TaskEntity task = requireTask(taskId);
    ensureViewAccess(user, task);
    TaskCommentEntity comment = new TaskCommentEntity();
    comment.setId(UUID.randomUUID().toString());
    comment.setTask(task);
    comment.setAuthorId(user.getUserId());
    comment.setAuthorName(user.getFullName());
    comment.setMessage(request.message().trim());
    comment.setCreatedAt(Instant.now());
    commentRepository.save(comment);
    logActivity(task, TaskActivityType.COMMENTED, user, "Added a comment.");
    return toComment(comment);
  }

  public List<TaskDtos.CommentResponse> listComments(String taskId, AppUserDetails user) {
    TaskEntity task = requireTask(taskId);
    ensureViewAccess(user, task);
    return commentRepository.findByTask_IdOrderByCreatedAtAsc(taskId).stream().map(this::toComment).toList();
  }

  public TaskDtos.ChecklistItemResponse addChecklistItem(String taskId, TaskDtos.ChecklistItemCreateRequest request, AppUserDetails user) {
    TaskEntity task = requireTask(taskId);
    ensureEditAccess(user, task);
    TaskChecklistItemEntity item = new TaskChecklistItemEntity();
    item.setId(UUID.randomUUID().toString());
    item.setTask(task);
    item.setLabel(request.label().trim());
    item.setCompleted(false);
    item.setCreatedAt(Instant.now());
    item.setUpdatedAt(Instant.now());
    checklistRepository.save(item);
    logActivity(task, TaskActivityType.CHECKLIST_UPDATED, user, "Added checklist item.");
    return toChecklist(item);
  }

  public TaskDtos.ChecklistItemResponse updateChecklistItem(
      String taskId,
      String itemId,
      TaskDtos.ChecklistItemUpdateRequest request,
      AppUserDetails user
  ) {
    TaskEntity task = requireTask(taskId);
    ensureEditAccess(user, task);
    TaskChecklistItemEntity item = checklistRepository.findByIdAndTask_Id(itemId, taskId)
        .orElseThrow(() -> new ResourceNotFoundException("Checklist item not found."));
    item.setLabel(request.label().trim());
    item.setCompleted(Boolean.TRUE.equals(request.completed()));
    item.setCompletedById(item.isCompleted() ? user.getUserId() : null);
    item.setCompletedByName(item.isCompleted() ? user.getFullName() : null);
    item.setUpdatedAt(Instant.now());
    checklistRepository.save(item);
    logActivity(task, TaskActivityType.CHECKLIST_UPDATED, user, "Updated checklist item.");
    return toChecklist(item);
  }

  public TaskDtos.TaskDetailResponse assignTask(String taskId, TaskDtos.AssignmentRequest request, AppUserDetails user, boolean reassign) {
    TaskEntity task = requireTask(taskId);
    ensureEditAccess(user, task);
    reassignInternal(task, user, request, reassign);
    return getTask(taskId, user);
  }

  public TaskDtos.TaskDetailResponse approveTask(String taskId, TaskDtos.ApprovalActionRequest request, AppUserDetails user, boolean approved) {
    TaskEntity task = requireTask(taskId);
    if (!canApprove(user, task)) {
      throw new ForbiddenOperationException("You cannot approve this task.");
    }
    task.setApprovalStatus(approved
        ? TaskApprovalStatus.APPROVED
        : Boolean.TRUE.equals(request.reworkRequested()) ? TaskApprovalStatus.REWORK_REQUESTED : TaskApprovalStatus.REJECTED);
    if (approved && task.getStatus() == TaskStatus.UNDER_REVIEW) {
      task.setStatus(TaskStatus.COMPLETED);
      task.setCompletionDate(LocalDate.now());
    }
    task.setUpdatedAt(Instant.now());
    taskRepository.save(task);
    logActivity(task, approved ? TaskActivityType.APPROVED : TaskActivityType.REJECTED, user,
        approved ? "Approved task." : "Rejected task" + (Boolean.TRUE.equals(request.reworkRequested()) ? " and requested rework." : "."));
    return getTask(taskId, user);
  }

  public TaskDtos.TimeLogResponse startTimer(String taskId, AppUserDetails user) {
    TaskEntity task = requireTask(taskId);
    ensureViewAccess(user, task);
    Optional<TaskTimeLogEntity> existing = timeLogRepository.findFirstByTask_IdAndUserIdAndEndedAtIsNullOrderByStartedAtDesc(taskId, user.getUserId());
    if (existing.isPresent()) {
      throw new BadRequestException("A timer is already running for this task.");
    }
    TaskTimeLogEntity log = new TaskTimeLogEntity();
    log.setId(UUID.randomUUID().toString());
    log.setTask(task);
    log.setUserId(user.getUserId());
    log.setUserName(user.getFullName());
    log.setStartedAt(Instant.now());
    log.setCreatedAt(Instant.now());
    timeLogRepository.save(log);
    logActivity(task, TaskActivityType.TIMER_STARTED, user, "Started timer.");
    return toTimeLog(log);
  }

  public TaskDtos.TimeLogResponse stopTimer(String taskId, TaskDtos.StopTimerRequest request, AppUserDetails user) {
    TaskEntity task = requireTask(taskId);
    ensureViewAccess(user, task);

    TaskTimeLogEntity log = timeLogRepository.findFirstByTask_IdAndUserIdAndEndedAtIsNullOrderByStartedAtDesc(taskId, user.getUserId())
        .orElseGet(() -> createManualTimeLog(task, request, user));

    Instant endedAt = request.endedAt() == null ? Instant.now() : request.endedAt();
    if (endedAt.isBefore(log.getStartedAt())) {
      throw new BadRequestException("End time cannot be before start time.");
    }
    log.setEndedAt(endedAt);
    log.setNote(trimToNull(request.note()));
    log.setDurationHours(durationHours(log.getStartedAt(), endedAt));
    timeLogRepository.save(log);
    refreshActualHours(task);
    logActivity(task, TaskActivityType.TIMER_STOPPED, user, "Logged " + log.getDurationHours() + "h.");
    return toTimeLog(log);
  }

  public TaskDtos.DashboardResponse dashboard(AppUserDetails user) {
    LocalDate today = LocalDate.now();
    List<TaskEntity> tasks = taskRepository.findAll().stream().filter(task -> canView(user, task)).toList();

    Map<String, Long> kpis = new LinkedHashMap<>();
    kpis.put("totalTasks", (long) tasks.size());
    kpis.put("pendingTasks", countByStatus(tasks, TaskStatus.PENDING, TaskStatus.ASSIGNED));
    kpis.put("inProgress", countByStatus(tasks, TaskStatus.IN_PROGRESS));
    kpis.put("completed", countByStatus(tasks, TaskStatus.COMPLETED));
    kpis.put("overdue", tasks.stream().filter(this::isOverdue).count());
    kpis.put("blocked", countByStatus(tasks, TaskStatus.BLOCKED));
    kpis.put("highPriority", tasks.stream().filter(task -> task.getPriority() == TaskPriority.HIGH || task.getPriority() == TaskPriority.CRITICAL).count());
    kpis.put("dueToday", tasks.stream().filter(task -> today.equals(task.getDueDate()) && task.getStatus() != TaskStatus.COMPLETED).count());

    Map<String, Long> distribution = tasks.stream()
        .collect(Collectors.groupingBy(task -> task.getStatus().name(), LinkedHashMap::new, Collectors.counting()));

    List<TaskDtos.ActivityResponse> recentActivity = activityRepository.findTop20ByOrderByCreatedAtDesc().stream()
        .filter(activity -> canView(user, activity.getTask()))
        .limit(10)
        .map(this::toActivity)
        .toList();

    List<TaskDtos.UpcomingDeadlineResponse> upcomingDeadlines = tasks.stream()
        .filter(task -> task.getDueDate() != null && task.getStatus() != TaskStatus.COMPLETED && task.getStatus() != TaskStatus.CANCELLED)
        .sorted(Comparator.comparing(TaskEntity::getDueDate))
        .limit(8)
        .map(task -> new TaskDtos.UpcomingDeadlineResponse(
            task.getId(),
            task.getTaskCode(),
            task.getTitle(),
            task.getDueDate(),
            task.getPriority(),
            task.getStatus(),
            task.getAssignedToName()
        ))
        .toList();

    Map<String, List<TaskEntity>> byAssignee = tasks.stream()
        .filter(task -> StringUtils.hasText(task.getAssignedToId()))
        .collect(Collectors.groupingBy(TaskEntity::getAssignedToId));
    List<TaskDtos.WorkloadResponse> workload = byAssignee.entrySet().stream()
        .map(entry -> {
          String assigneeId = entry.getKey();
          List<TaskEntity> assigneeTasks = entry.getValue();
          BigDecimal loggedHours = assigneeTasks.stream()
              .map(TaskEntity::getActualHours)
              .reduce(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), BigDecimal::add);
          TaskEntity first = assigneeTasks.get(0);
          return new TaskDtos.WorkloadResponse(
              assigneeId,
              first.getAssignedToName(),
              assigneeTasks.size(),
              assigneeTasks.stream().filter(task -> task.getStatus() == TaskStatus.COMPLETED).count(),
              assigneeTasks.stream().filter(this::isOverdue).count(),
              loggedHours
          );
        })
        .sorted(Comparator.comparing(TaskDtos.WorkloadResponse::assigned).reversed())
        .limit(8)
        .toList();

    TaskDtos.AssignedCompletedMetricsResponse metrics = new TaskDtos.AssignedCompletedMetricsResponse(
        tasks.stream().filter(task -> StringUtils.hasText(task.getAssignedToId())).count(),
        tasks.stream().filter(task -> task.getStatus() == TaskStatus.COMPLETED).count()
    );

    return new TaskDtos.DashboardResponse(kpis, distribution, recentActivity, upcomingDeadlines, workload, metrics);
  }

  private TaskTimeLogEntity createManualTimeLog(TaskEntity task, TaskDtos.StopTimerRequest request, AppUserDetails user) {
    if (request.startedAt() == null || request.endedAt() == null) {
      throw new BadRequestException("No active timer found. Provide both startedAt and endedAt for a manual time entry.");
    }
    TaskTimeLogEntity log = new TaskTimeLogEntity();
    log.setId(UUID.randomUUID().toString());
    log.setTask(task);
    log.setUserId(user.getUserId());
    log.setUserName(user.getFullName());
    log.setStartedAt(request.startedAt());
    log.setCreatedAt(Instant.now());
    return log;
  }

  private void reassignInternal(TaskEntity task, AppUserDetails user, TaskDtos.AssignmentRequest request, boolean reassign) {
    Instant now = Instant.now();
    if (Boolean.TRUE.equals(request.preventDuplicateActiveAssignments())) {
      assignmentRepository.findFirstByTask_IdAndActiveTrueOrderByAssignedAtDesc(task.getId())
          .filter(existing -> existing.getAssignedToId().equals(request.assignedToId()))
          .ifPresent(existing -> {
            throw new BadRequestException("An active assignment already exists for this assignee.");
          });
    }

    assignmentRepository.findFirstByTask_IdAndActiveTrueOrderByAssignedAtDesc(task.getId()).ifPresent(active -> {
      active.setActive(false);
      active.setEndedAt(now);
      assignmentRepository.save(active);
    });

    task.setAssignedById(user.getUserId());
    task.setAssignedByName(user.getFullName());
    task.setAssignedToId(request.assignedToId().trim());
    task.setAssignedToName(request.assignedToName().trim());
    task.setAssignedToEmail(trimToNull(request.assignedToEmail()));
    task.setAssignedTeamName(trimToNull(request.assignedTeamName()));
    task.setStatus(task.getStatus() == TaskStatus.PENDING ? TaskStatus.ASSIGNED : task.getStatus());
    task.setUpdatedAt(now);
    taskRepository.save(task);

    saveAssignment(task, user, task.getAssignedToId(), task.getAssignedToName(), task.getAssignedToEmail(), task.getAssignedTeamName(), true, now);
    logActivity(task, reassign ? TaskActivityType.REASSIGNED : TaskActivityType.ASSIGNED, user,
        (reassign ? "Reassigned task to " : "Assigned task to ") + task.getAssignedToName() + ".");
  }

  private void saveAssignment(
      TaskEntity task,
      AppUserDetails user,
      String assignedToId,
      String assignedToName,
      String assignedToEmail,
      String assignedTeamName,
      boolean active,
      Instant when
  ) {
    TaskAssignmentEntity assignment = new TaskAssignmentEntity();
    assignment.setId(UUID.randomUUID().toString());
    assignment.setTask(task);
    assignment.setAssignedById(user.getUserId());
    assignment.setAssignedByName(user.getFullName());
    assignment.setAssignedToId(assignedToId);
    assignment.setAssignedToName(assignedToName);
    assignment.setAssignedToEmail(assignedToEmail);
    assignment.setAssignedTeamName(assignedTeamName);
    assignment.setActive(active);
    assignment.setAssignedAt(when);
    assignmentRepository.save(assignment);
  }

  private void syncChildCollections(TaskEntity task, TaskDtos.TaskRequest request, AppUserDetails user, Instant now) {
    if (request.tags() != null) {
      task.getTags().clear();
      request.tags().stream()
          .filter(tag -> StringUtils.hasText(tag.name()))
          .forEach(tag -> {
            TaskTagEntity entity = new TaskTagEntity();
            entity.setId(UUID.randomUUID().toString());
            entity.setTask(task);
            entity.setName(tag.name().trim());
            entity.setCreatedAt(now);
            task.getTags().add(entity);
          });
    }

    if (request.attachments() != null) {
      task.getAttachments().clear();
      request.attachments().forEach(attachment -> {
        TaskAttachmentEntity entity = new TaskAttachmentEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setTask(task);
        entity.setFileName(attachment.fileName().trim());
        entity.setFileUrl(attachment.fileUrl().trim());
        entity.setContentType(trimToNull(attachment.contentType()));
        entity.setFileSize(attachment.fileSize());
        entity.setUploadedById(user.getUserId());
        entity.setUploadedByName(user.getFullName());
        entity.setCreatedAt(now);
        task.getAttachments().add(entity);
      });
    }

    if (request.dependencies() != null) {
      task.getDependencies().clear();
      request.dependencies().stream()
          .filter(dep -> StringUtils.hasText(dep.taskId()))
          .forEach(dep -> {
            TaskDependencyEntity entity = new TaskDependencyEntity();
            entity.setId(UUID.randomUUID().toString());
            entity.setTask(task);
            entity.setDependsOnTaskId(dep.taskId().trim());
            entity.setDependsOnTaskCode(trimToNull(dep.taskCode()));
            entity.setDependsOnTitle(trimToNull(dep.title()));
            entity.setCreatedAt(now);
            task.getDependencies().add(entity);
          });
    }

    if (request.checklistItems() != null) {
      task.getChecklistItems().clear();
      request.checklistItems().stream()
          .filter(item -> StringUtils.hasText(item.label()))
          .forEach(item -> {
            TaskChecklistItemEntity entity = new TaskChecklistItemEntity();
            entity.setId(UUID.randomUUID().toString());
            entity.setTask(task);
            entity.setLabel(item.label().trim());
            entity.setCompleted(false);
            entity.setCreatedAt(now);
            entity.setUpdatedAt(now);
            task.getChecklistItems().add(entity);
          });
    }
  }

  private TaskDtos.TaskDetailResponse toDetail(TaskEntity task) {
    List<TaskDtos.CommentResponse> comments = commentRepository.findByTask_IdOrderByCreatedAtAsc(task.getId()).stream().map(this::toComment).toList();
    List<TaskDtos.ChecklistItemResponse> checklist = checklistRepository.findByTask_IdOrderByCreatedAtAsc(task.getId()).stream().map(this::toChecklist).toList();
    List<TaskDtos.AssignmentHistoryResponse> assignments = assignmentRepository.findByTask_IdOrderByAssignedAtDesc(task.getId()).stream().map(this::toAssignment).toList();
    List<TaskDtos.ActivityResponse> activity = activityRepository.findByTask_IdOrderByCreatedAtAsc(task.getId()).stream().map(this::toActivity).toList();
    List<TaskDtos.TimeLogResponse> timeLogs = timeLogRepository.findByTask_IdOrderByStartedAtDesc(task.getId()).stream().map(this::toTimeLog).toList();
    return new TaskDtos.TaskDetailResponse(
        toSummary(task),
        comments,
        checklist,
        task.getAttachments().stream().map(this::toAttachment).toList(),
        task.getDependencies().stream().map(this::toDependency).toList(),
        assignments,
        activity,
        timeLogs
    );
  }

  private TaskDtos.TaskSummaryResponse toSummary(TaskEntity task) {
    int checklistTotal = task.getChecklistItems().size();
    int checklistCompleted = (int) task.getChecklistItems().stream().filter(TaskChecklistItemEntity::isCompleted).count();
    return new TaskDtos.TaskSummaryResponse(
        task.getId(),
        task.getTaskCode(),
        task.getTitle(),
        task.getDescription(),
        task.getPriority(),
        task.getStatus(),
        task.getApprovalStatus(),
        task.getVisibility(),
        task.getStartDate(),
        task.getDueDate(),
        task.getCompletionDate(),
        task.getProjectRef(),
        task.getModuleRef(),
        task.getAssignedToId(),
        task.getAssignedToName(),
        task.getAssignedTeamName(),
        task.getEstimatedHours(),
        task.getActualHours(),
        task.getTags().stream().map(TaskTagEntity::getName).toList(),
        checklistCompleted,
        checklistTotal,
        isOverdue(task),
        task.getUpdatedAt()
    );
  }

  private TaskDtos.CommentResponse toComment(TaskCommentEntity comment) {
    return new TaskDtos.CommentResponse(comment.getId(), comment.getAuthorId(), comment.getAuthorName(), comment.getMessage(), comment.getCreatedAt());
  }

  private TaskDtos.ChecklistItemResponse toChecklist(TaskChecklistItemEntity item) {
    return new TaskDtos.ChecklistItemResponse(item.getId(), item.getLabel(), item.isCompleted(), item.getCompletedById(), item.getCompletedByName(), item.getCreatedAt(), item.getUpdatedAt());
  }

  private TaskDtos.AttachmentResponse toAttachment(TaskAttachmentEntity attachment) {
    return new TaskDtos.AttachmentResponse(attachment.getId(), attachment.getFileName(), attachment.getFileUrl(), attachment.getContentType(), attachment.getFileSize(), attachment.getUploadedByName(), attachment.getCreatedAt());
  }

  private TaskDtos.DependencyResponse toDependency(TaskDependencyEntity dependency) {
    return new TaskDtos.DependencyResponse(dependency.getId(), dependency.getDependsOnTaskId(), dependency.getDependsOnTaskCode(), dependency.getDependsOnTitle());
  }

  private TaskDtos.AssignmentHistoryResponse toAssignment(TaskAssignmentEntity assignment) {
    return new TaskDtos.AssignmentHistoryResponse(
        assignment.getId(),
        assignment.getAssignedById(),
        assignment.getAssignedByName(),
        assignment.getAssignedToId(),
        assignment.getAssignedToName(),
        assignment.getAssignedToEmail(),
        assignment.getAssignedTeamName(),
        assignment.isActive(),
        assignment.getAssignedAt(),
        assignment.getEndedAt()
    );
  }

  private TaskDtos.ActivityResponse toActivity(TaskActivityLogEntity activity) {
    return new TaskDtos.ActivityResponse(activity.getId(), activity.getActivityType(), activity.getActorId(), activity.getActorName(), activity.getMessage(), activity.getCreatedAt());
  }

  private TaskDtos.TimeLogResponse toTimeLog(TaskTimeLogEntity log) {
    return new TaskDtos.TimeLogResponse(log.getId(), log.getUserId(), log.getUserName(), log.getStartedAt(), log.getEndedAt(), log.getDurationHours(), log.getNote(), log.getCreatedAt());
  }

  private void refreshActualHours(TaskEntity task) {
    BigDecimal total = timeLogRepository.findByTask_IdOrderByStartedAtDesc(task.getId()).stream()
        .map(TaskTimeLogEntity::getDurationHours)
        .filter(value -> value != null)
        .reduce(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), BigDecimal::add);
    task.setActualHours(total);
    task.setUpdatedAt(Instant.now());
    taskRepository.save(task);
  }

  private void logActivity(TaskEntity task, TaskActivityType type, AppUserDetails user, String message) {
    TaskActivityLogEntity activity = new TaskActivityLogEntity();
    activity.setId(UUID.randomUUID().toString());
    activity.setTask(task);
    activity.setActivityType(type);
    activity.setActorId(user.getUserId());
    activity.setActorName(user.getFullName());
    activity.setMessage(message);
    activity.setCreatedAt(Instant.now());
    activityRepository.save(activity);
  }

  private boolean canView(AppUserDetails user, TaskEntity task) {
    if (hasPrivilegedRole(user)) {
      return true;
    }
    return equalsNullable(user.getUserId(), task.getCreatedById())
        || equalsNullable(user.getUserId(), task.getAssignedToId())
        || equalsNullable(user.getUserId(), task.getApproverId());
  }

  private boolean canApprove(AppUserDetails user, TaskEntity task) {
    return hasPrivilegedRole(user) || equalsNullable(user.getUserId(), task.getApproverId());
  }

  private void ensureViewAccess(AppUserDetails user, TaskEntity task) {
    if (!canView(user, task)) {
      throw new ForbiddenOperationException("You do not have access to this task.");
    }
  }

  private void ensureEditAccess(AppUserDetails user, TaskEntity task) {
    if (hasPrivilegedRole(user)
        || equalsNullable(user.getUserId(), task.getCreatedById())
        || equalsNullable(user.getUserId(), task.getAssignedById())) {
      return;
    }
    throw new ForbiddenOperationException("You do not have permission to modify this task.");
  }

  private boolean hasPrivilegedRole(AppUserDetails user) {
    return user.getRoleNames().stream().anyMatch(PRIVILEGED_ROLES::contains);
  }

  private Predicate<TaskEntity> buildPredicate(
      String search,
      String status,
      String priority,
      String scope,
      String assigneeId,
      String projectRef,
      String moduleRef,
      String approvalStatus,
      Boolean overdue,
      Boolean dueToday,
      AppUserDetails user
  ) {
    List<Predicate<TaskEntity>> predicates = new ArrayList<>();
    if (StringUtils.hasText(search)) {
      String needle = search.trim().toLowerCase(Locale.ROOT);
      predicates.add(task -> contains(task.getTitle(), needle)
          || contains(task.getTaskCode(), needle)
          || contains(task.getAssignedToName(), needle)
          || contains(task.getProjectRef(), needle)
          || contains(task.getModuleRef(), needle));
    }
    if (StringUtils.hasText(status)) {
      predicates.add(task -> task.getStatus().name().equalsIgnoreCase(status.trim()));
    }
    if (StringUtils.hasText(priority)) {
      predicates.add(task -> task.getPriority().name().equalsIgnoreCase(priority.trim()));
    }
    if (StringUtils.hasText(assigneeId)) {
      predicates.add(task -> assigneeId.trim().equals(task.getAssignedToId()));
    }
    if (StringUtils.hasText(projectRef)) {
      predicates.add(task -> projectRef.trim().equalsIgnoreCase(String.valueOf(task.getProjectRef())));
    }
    if (StringUtils.hasText(moduleRef)) {
      predicates.add(task -> moduleRef.trim().equalsIgnoreCase(String.valueOf(task.getModuleRef())));
    }
    if (StringUtils.hasText(approvalStatus)) {
      predicates.add(task -> task.getApprovalStatus().name().equalsIgnoreCase(approvalStatus.trim()));
    }
    if (Boolean.TRUE.equals(overdue)) {
      predicates.add(this::isOverdue);
    }
    if (Boolean.TRUE.equals(dueToday)) {
      predicates.add(task -> LocalDate.now().equals(task.getDueDate()));
    }
    if ("my".equalsIgnoreCase(scope)) {
      predicates.add(task -> equalsNullable(user.getUserId(), task.getAssignedToId()) || equalsNullable(user.getUserId(), task.getCreatedById()));
    } else if ("team".equalsIgnoreCase(scope)) {
      predicates.add(task -> equalsNullable(user.getUserId(), task.getAssignedById()) || equalsNullable(user.getUserId(), task.getApproverId()));
    }
    return predicates.stream().reduce(task -> true, Predicate::and);
  }

  private TaskApprovalStatus resolveApprovalStatus(
      TaskDtos.TaskRequest request,
      boolean currentApprovalRequired,
      TaskApprovalStatus currentStatus
  ) {
    boolean approvalRequired = request.approvalRequired() == null ? currentApprovalRequired : Boolean.TRUE.equals(request.approvalRequired());
    if (!approvalRequired) {
      return TaskApprovalStatus.NOT_REQUIRED;
    }
    return request.approvalStatus() == null ? (currentStatus == TaskApprovalStatus.NOT_REQUIRED ? TaskApprovalStatus.PENDING_APPROVAL : currentStatus) : request.approvalStatus();
  }

  private long countByStatus(List<TaskEntity> tasks, TaskStatus... statuses) {
    List<TaskStatus> allowed = List.of(statuses);
    return tasks.stream().filter(task -> allowed.contains(task.getStatus())).count();
  }

  private boolean isOverdue(TaskEntity task) {
    return task.getDueDate() != null
        && task.getDueDate().isBefore(LocalDate.now())
        && task.getStatus() != TaskStatus.COMPLETED
        && task.getStatus() != TaskStatus.CANCELLED;
  }

  private String nextTaskCode() {
    long number = taskRepository.count() + 1;
    return "TSK-" + String.format("%05d", number);
  }

  private TaskEntity requireTask(String id) {
    return taskRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Task not found."));
  }

  private void validateTaskDates(LocalDate startDate, LocalDate dueDate) {
    if (startDate != null && dueDate != null && dueDate.isBefore(startDate)) {
      throw new BadRequestException("Due date cannot be before start date.");
    }
  }

  private LocalDate resolveCompletionDate(TaskStatus status, LocalDate currentValue) {
    if (status == TaskStatus.COMPLETED) {
      return currentValue == null ? LocalDate.now() : currentValue;
    }
    return null;
  }

  private BigDecimal durationHours(Instant startedAt, Instant endedAt) {
    long seconds = Duration.between(startedAt, endedAt).getSeconds();
    BigDecimal hours = BigDecimal.valueOf(seconds).divide(BigDecimal.valueOf(3600), 2, RoundingMode.HALF_UP);
    return hours.max(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
  }

  private BigDecimal defaultBigDecimal(BigDecimal value) {
    return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
  }

  private boolean contains(String value, String needle) {
    return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
  }

  private boolean equalsNullable(String left, String right) {
    return left != null && left.equals(right);
  }

  private String trimToNull(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return value.trim();
  }

  private String readable(String value) {
    return value.toLowerCase(Locale.ROOT).replace('_', ' ');
  }
}
