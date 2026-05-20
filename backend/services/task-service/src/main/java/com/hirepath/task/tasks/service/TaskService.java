package com.hirepath.task.tasks.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

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
import com.hirepath.task.tasks.domain.TaskRelationshipType;
import com.hirepath.task.tasks.domain.TaskSpaceEntity;
import com.hirepath.task.tasks.domain.TaskSpaceInvitationEntity;
import com.hirepath.task.tasks.domain.TaskSpaceInvitationStatus;
import com.hirepath.task.tasks.domain.TaskSpaceMemberEntity;
import com.hirepath.task.tasks.domain.TaskSpaceMemberRole;
import com.hirepath.task.tasks.domain.TaskSpacePermission;
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
import com.hirepath.task.tasks.repository.TaskSpaceInvitationRepository;
import com.hirepath.task.tasks.repository.TaskSpaceMemberRepository;
import com.hirepath.task.tasks.repository.TaskSpaceRepository;
import com.hirepath.task.tasks.repository.TaskTimeLogRepository;

import jakarta.transaction.Transactional;

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

  private static final long ORDER_INCREMENT = 1024L;
  private static final EnumSet<TaskSpacePermission> ALL_SPACE_PERMISSIONS = EnumSet.allOf(TaskSpacePermission.class);

  private final TaskRepository taskRepository;
  private final TaskCommentRepository commentRepository;
  private final TaskChecklistRepository checklistRepository;
  private final TaskAssignmentRepository assignmentRepository;
  private final TaskActivityLogRepository activityRepository;
  private final TaskTimeLogRepository timeLogRepository;
  private final TaskSpaceRepository taskSpaceRepository;
  private final TaskSpaceMemberRepository taskSpaceMemberRepository;
  private final TaskSpaceInvitationRepository taskSpaceInvitationRepository;
  private final TaskSpaceNotificationService taskSpaceNotificationService;
  private final TaskSpaceStreamService taskSpaceStreamService;

  public TaskService(
      TaskRepository taskRepository,
      TaskCommentRepository commentRepository,
      TaskChecklistRepository checklistRepository,
      TaskAssignmentRepository assignmentRepository,
      TaskActivityLogRepository activityRepository,
      TaskTimeLogRepository timeLogRepository,
      TaskSpaceRepository taskSpaceRepository,
      TaskSpaceMemberRepository taskSpaceMemberRepository,
      TaskSpaceInvitationRepository taskSpaceInvitationRepository,
      TaskSpaceNotificationService taskSpaceNotificationService,
      TaskSpaceStreamService taskSpaceStreamService
  ) {
    this.taskRepository = taskRepository;
    this.commentRepository = commentRepository;
    this.checklistRepository = checklistRepository;
    this.assignmentRepository = assignmentRepository;
    this.activityRepository = activityRepository;
    this.timeLogRepository = timeLogRepository;
    this.taskSpaceRepository = taskSpaceRepository;
    this.taskSpaceMemberRepository = taskSpaceMemberRepository;
    this.taskSpaceInvitationRepository = taskSpaceInvitationRepository;
    this.taskSpaceNotificationService = taskSpaceNotificationService;
    this.taskSpaceStreamService = taskSpaceStreamService;
  }

  public TaskDtos.TaskDetailResponse createTask(TaskDtos.TaskRequest request, AppUserDetails user) {
    return createTaskInternal(request, user, request.parentTaskId());
  }

  public TaskDtos.TaskDetailResponse addSubtask(String taskId, TaskDtos.TaskRequest request, AppUserDetails user) {
    TaskEntity parent = requireTask(taskId);
    ensureEditAccess(user, parent);
    return createTaskInternal(request, user, parent.getId());
  }

  public TaskDtos.TaskListResponse listTasks(
      String search,
      String status,
      String priority,
      String scope,
      String assigneeId,
      String spaceId,
      String projectRef,
      String moduleRef,
      String approvalStatus,
      Boolean overdue,
      Boolean dueToday,
      int page,
      int pageSize,
      AppUserDetails user
  ) {
    List<TaskEntity> visible = filteredVisibleTasks(search, status, priority, scope, assigneeId, spaceId, projectRef, moduleRef, approvalStatus, overdue, dueToday, user);
    TreeContext context = buildTreeContext(visible, user);
    List<TaskDtos.TaskSummaryResponse> flattened = flattenSummaries(context, null);

    int normalizedPage = Math.max(page, 1);
    int normalizedSize = Math.max(1, Math.min(pageSize, 100));
    int fromIndex = Math.min((normalizedPage - 1) * normalizedSize, flattened.size());
    int toIndex = Math.min(fromIndex + normalizedSize, flattened.size());
    int totalPages = flattened.isEmpty() ? 1 : (int) Math.ceil((double) flattened.size() / normalizedSize);
    return new TaskDtos.TaskListResponse(flattened.subList(fromIndex, toIndex), flattened.size(), normalizedPage, normalizedSize, totalPages);
  }

  public TaskDtos.TaskTreeResponse treeTasks(
      String search,
      String status,
      String priority,
      String scope,
      String assigneeId,
      String spaceId,
      String projectRef,
      String moduleRef,
      String approvalStatus,
      Boolean overdue,
      Boolean dueToday,
      AppUserDetails user
  ) {
    List<TaskEntity> visible = filteredVisibleTasks(search, status, priority, scope, assigneeId, spaceId, projectRef, moduleRef, approvalStatus, overdue, dueToday, user);
    TreeContext context = buildTreeContext(visible, user);
    return new TaskDtos.TaskTreeResponse(buildSummaries(context, null));
  }

  public TaskDtos.TaskTreeResponse getSubtasks(String id, AppUserDetails user) {
    TaskEntity task = requireTask(id);
    ensureViewAccess(user, task);
    List<TaskEntity> visible = visibleTasks(user);
    TreeContext context = buildTreeContext(visible, user);
    return new TaskDtos.TaskTreeResponse(buildSummaries(context, id));
  }

  public TaskDtos.TaskDetailResponse getTask(String id, AppUserDetails user) {
    TaskEntity task = requireTask(id);
    ensureViewAccess(user, task);
    return toDetail(task, buildTreeContext(visibleTasks(user), user));
  }

  public TaskDtos.TaskDetailResponse updateTask(String id, TaskDtos.TaskRequest request, AppUserDetails user) {
    TaskEntity task = requireTask(id);
    ensureEditAccess(user, task);
    validateTaskDates(request.startDate(), request.dueDate());
    validateAssignee(request.assignedToId(), request.assignedToName());
    TaskSpaceEntity targetSpace = resolveManagedSpace(request.spaceId(), user);

    TaskStatus previousStatus = task.getStatus();
    TaskPriority previousPriority = task.getPriority();
    String previousAssignee = task.getAssignedToId();
    String previousParent = task.getParentTaskId();

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
    if (request.spaceId() != null) task.setSpaceId(targetSpace == null ? null : targetSpace.getId());
    if (request.assignedToId() != null || request.assignedToName() != null) {
      if (StringUtils.hasText(request.assignedToId())) {
        task.setAssignedToId(request.assignedToId().trim());
        task.setAssignedToName(request.assignedToName().trim());
        if (request.assignedToEmail() != null) task.setAssignedToEmail(trimToNull(request.assignedToEmail()));
        if (request.assignedTeamName() != null) task.setAssignedTeamName(trimToNull(request.assignedTeamName()));
      } else {
        clearAssignee(task);
      }
    } else {
      if (request.assignedToEmail() != null) task.setAssignedToEmail(trimToNull(request.assignedToEmail()));
      if (request.assignedTeamName() != null) task.setAssignedTeamName(trimToNull(request.assignedTeamName()));
    }
    if (request.approverId() != null) task.setApproverId(trimToNull(request.approverId()));
    if (request.approverName() != null) task.setApproverName(trimToNull(request.approverName()));
    if (request.estimatedHours() != null) task.setEstimatedHours(defaultBigDecimal(request.estimatedHours()));
    if (request.reminderMinutesBefore() != null) task.setReminderMinutesBefore(request.reminderMinutesBefore());
    if (request.startDate() != null || task.getStartDate() == null) task.setStartDate(request.startDate());
    if (request.dueDate() != null || task.getDueDate() == null) task.setDueDate(request.dueDate());
    task.setCompletionDate(resolveCompletionDate(task.getStatus(), task.getCompletionDate()));
    task.setUpdatedAt(Instant.now());
    syncChildCollections(task, request, user, Instant.now());

    if (request.parentTaskId() != null && !Objects.equals(previousParent, trimToNull(request.parentTaskId()))) {
      reparent(task, trimToNull(request.parentTaskId()));
    }
    if (request.orderIndex() != null) {
      task.setOrderIndex(request.orderIndex());
    }

    taskRepository.save(task);
    refreshHierarchyMetadata(task);

    if (previousStatus != task.getStatus()) {
      logActivity(task, TaskActivityType.STATUS_CHANGED, user, "Status changed to " + readable(task.getStatus().name()) + ".");
    }
    if (previousPriority != task.getPriority()) {
      logActivity(task, TaskActivityType.PRIORITY_CHANGED, user, "Priority changed to " + readable(task.getPriority().name()) + ".");
    }
    if (!Objects.equals(previousParent, task.getParentTaskId())) {
      logActivity(task, TaskActivityType.UPDATED, user, task.getParentTaskId() == null ? "Converted item to top-level task." : "Converted item into nested subtask.");
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

  public TaskDtos.TaskDetailResponse updateTaskStatus(String id, TaskDtos.TaskStatusUpdateRequest request, AppUserDetails user) {
    TaskEntity task = requireTask(id);
    ensureExecutionAccess(user, task);

    TaskStatus nextStatus = request.status();
    TaskStatus previousStatus = task.getStatus();
    if (previousStatus == nextStatus) {
      return getTask(id, user);
    }

    task.setStatus(nextStatus);
    task.setCompletionDate(resolveCompletionDate(nextStatus, task.getCompletionDate()));
    task.setUpdatedAt(Instant.now());
    taskRepository.save(task);

    logActivity(task, TaskActivityType.STATUS_CHANGED, user, "Status changed to " + readable(nextStatus.name()) + ".");
    return getTask(id, user);
  }

  public TaskDtos.TaskDetailResponse reorderHierarchy(String id, TaskDtos.ReorderHierarchyRequest request, AppUserDetails user) {
    TaskEntity task = requireTask(id);
    ensureEditAccess(user, task);
    reparent(task, trimToNull(request.parentTaskId()));
    task.setOrderIndex(request.orderIndex() == null ? nextOrderIndex(task.getParentTaskId()) : request.orderIndex());
    task.setUpdatedAt(Instant.now());
    taskRepository.save(task);
    refreshHierarchyMetadata(task);
    logActivity(task, TaskActivityType.UPDATED, user, "Hierarchy reordered.");
    return getTask(id, user);
  }

  public void deleteTask(String id, AppUserDetails user) {
    TaskEntity task = requireTask(id);
    ensureEditAccess(user, task);
    taskRepository.delete(task);
  }

  public TaskDtos.CommentResponse addComment(String taskId, TaskDtos.CommentCreateRequest request, AppUserDetails user) {
    TaskEntity task = requireTask(taskId);
    ensureExecutionAccess(user, task);
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
    ensureExecutionAccess(user, task);
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
    List<TaskEntity> tasks = visibleTasks(user);

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

    TreeContext context = buildTreeContext(tasks, user);
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
        tasks.stream().filter(task -> progressPercent(task, context) == 100).count()
    );

    return new TaskDtos.DashboardResponse(kpis, distribution, recentActivity, upcomingDeadlines, workload, metrics);
  }

  public List<TaskDtos.SpaceSummaryResponse> listSpaces(AppUserDetails user) {
    return accessibleSpaces(user).stream().map(space -> toSpaceSummary(space, user)).toList();
  }

  public TaskDtos.SpaceDetailResponse createSpace(TaskDtos.SpaceCreateRequest request, AppUserDetails user) {
    Instant now = Instant.now();
    String actorName = firstNonBlank(user.getFullName(), user.getUsername());
    TaskSpaceEntity space = new TaskSpaceEntity();
    space.setId(UUID.randomUUID().toString());
    space.setSpaceKey(nextSpaceKey(request.name()));
    space.setName(request.name().trim());
    space.setDescription(trimToNull(request.description()));
    space.setIconName(trimToNull(request.iconName()));
    space.setColorHex(trimToNull(request.colorHex()));
    space.setVisibility(request.visibility());
    space.setOwnerUserId(user.getUserId());
    space.setOwnerUserName(actorName);
    space.setArchived(false);
    space.setCreatedAt(now);
    space.setUpdatedAt(now);
    taskSpaceRepository.save(space);

    TaskSpaceMemberEntity owner = new TaskSpaceMemberEntity();
    owner.setId(UUID.randomUUID().toString());
    owner.setSpace(space);
    owner.setUserId(user.getUserId());
    owner.setUserName(actorName);
    owner.setUserEmail(trimToNull(user.getUsername()));
    owner.setRole(TaskSpaceMemberRole.OWNER);
    owner.setPermissions(serializePermissions(defaultPermissionsForRole(TaskSpaceMemberRole.OWNER)));
    owner.setActive(true);
    owner.setInvitedById(user.getUserId());
    owner.setInvitedByName(actorName);
    owner.setJoinedAt(now);
    owner.setCreatedAt(now);
    owner.setUpdatedAt(now);
    taskSpaceMemberRepository.save(owner);

    Set<String> seededUserIds = new HashSet<>();
    seededUserIds.add(user.getUserId());
    if (request.members() != null) {
      for (TaskDtos.SpaceMemberSeedRequest memberRequest : request.members()) {
        if (memberRequest == null || !StringUtils.hasText(memberRequest.userId()) || !StringUtils.hasText(memberRequest.userName())) {
          continue;
        }
        String memberUserId = memberRequest.userId().trim();
        if (!seededUserIds.add(memberUserId)) {
          continue;
        }
        TaskSpaceMemberEntity member = new TaskSpaceMemberEntity();
        member.setId(UUID.randomUUID().toString());
        member.setSpace(space);
        member.setUserId(memberUserId);
        member.setUserName(memberRequest.userName().trim());
        member.setUserEmail(trimToNull(memberRequest.userEmail()));
        TaskSpaceMemberRole memberRole = memberRequest.role() == null ? TaskSpaceMemberRole.MEMBER : memberRequest.role();
        member.setRole(memberRole);
        member.setPermissions(serializePermissions(resolvePermissions(memberRequest.permissions(), memberRole)));
        member.setActive(true);
        member.setInvitedById(user.getUserId());
        member.setInvitedByName(actorName);
        member.setJoinedAt(now);
        member.setCreatedAt(now);
        member.setUpdatedAt(now);
        taskSpaceMemberRepository.save(member);
      }
    }

    taskSpaceStreamService.publishSpaceUpdate(user.getUserId(), "SPACE_CREATED", space.getId());
    broadcastSpaceMembers(space, "SPACE_MEMBER_ADDED");
    return getSpace(space.getId(), user);
  }

  public TaskDtos.SpaceDetailResponse getSpace(String spaceId, AppUserDetails user) {
    TaskSpaceEntity space = requireSpace(spaceId);
    ensureSpaceMember(user, space);
    List<TaskDtos.SpaceMemberResponse> members = taskSpaceMemberRepository.findBySpace_IdAndActiveTrueOrderByRoleAscUserNameAsc(spaceId).stream()
        .map(this::toSpaceMember)
        .toList();
    List<TaskDtos.SpaceInvitationResponse> invitations = taskSpaceInvitationRepository.findBySpace_IdOrderByCreatedAtDesc(spaceId).stream()
        .map(this::toInvitation)
        .toList();
    return new TaskDtos.SpaceDetailResponse(toSpaceSummary(space, user), members, invitations);
  }

  public TaskDtos.SpaceDetailResponse updateSpace(String spaceId, TaskDtos.SpaceUpdateRequest request, AppUserDetails user) {
    TaskSpaceEntity space = requireSpace(spaceId);
    ensureSpaceManager(user, space);
    if (request.name() != null && StringUtils.hasText(request.name())) {
      space.setName(request.name().trim());
    }
    if (request.description() != null) {
      space.setDescription(trimToNull(request.description()));
    }
    if (request.iconName() != null) {
      space.setIconName(trimToNull(request.iconName()));
    }
    if (request.colorHex() != null) {
      space.setColorHex(trimToNull(request.colorHex()));
    }
    if (request.visibility() != null) {
      space.setVisibility(request.visibility());
    }
    if (request.archived() != null) {
      space.setArchived(Boolean.TRUE.equals(request.archived()));
    }
    space.setUpdatedAt(Instant.now());
    taskSpaceRepository.save(space);
    broadcastSpaceMembers(space, "SPACE_UPDATED");
    return getSpace(spaceId, user);
  }

  public void deleteSpace(String spaceId, AppUserDetails user) {
    TaskSpaceEntity space = requireSpace(spaceId);
    ensureSpaceOwner(user, space);
    taskRepository.findAll().stream()
        .filter(task -> spaceId.equals(task.getSpaceId()))
        .forEach(task -> task.setSpaceId(null));
    taskSpaceRepository.delete(space);
    taskSpaceStreamService.publishSpaceUpdate(user.getUserId(), "SPACE_DELETED", spaceId);
  }

  public TaskDtos.SpaceInvitationResponse inviteToSpace(String spaceId, TaskDtos.SpaceInvitationRequest request, AppUserDetails user) {
    TaskSpaceEntity space = requireSpace(spaceId);
    ensureSpaceManager(user, space);
    String actorName = firstNonBlank(user.getFullName(), user.getUsername());
    if (taskSpaceMemberRepository.existsBySpace_IdAndUserIdAndActiveTrue(spaceId, request.userId().trim())) {
      throw new BadRequestException("User is already a member of this space.");
    }
    taskSpaceInvitationRepository.findBySpace_IdAndInviteeUserIdAndStatus(spaceId, request.userId().trim(), TaskSpaceInvitationStatus.PENDING)
        .ifPresent(existing -> {
          throw new BadRequestException("A pending invitation already exists for this user.");
        });

    Instant now = Instant.now();
    TaskSpaceInvitationEntity invitation = new TaskSpaceInvitationEntity();
    invitation.setId(UUID.randomUUID().toString());
    invitation.setSpace(space);
    invitation.setInviteeUserId(request.userId().trim());
    invitation.setInviteeName(request.userName().trim());
    invitation.setInviteeEmail(trimToNull(request.userEmail()));
    invitation.setInvitedById(user.getUserId());
    invitation.setInvitedByName(actorName);
    TaskSpaceMemberRole inviteRole = request.role() == null ? TaskSpaceMemberRole.MEMBER : request.role();
    invitation.setRole(inviteRole);
    invitation.setPermissions(serializePermissions(resolvePermissions(request.permissions(), inviteRole)));
    invitation.setStatus(TaskSpaceInvitationStatus.PENDING);
    invitation.setMessage(trimToNull(request.message()));
    invitation.setCreatedAt(now);
    invitation.setUpdatedAt(now);
    taskSpaceInvitationRepository.save(invitation);

    taskSpaceNotificationService.sendInvitation(invitation, space);
    taskSpaceStreamService.publishInvitation(invitation.getInviteeUserId(), "SPACE_INVITATION_CREATED", spaceId, invitation.getId());
    return toInvitation(invitation);
  }

  public List<TaskDtos.SpaceInvitationResponse> listMyInvitations(AppUserDetails user) {
    return taskSpaceInvitationRepository.findByInviteeUserIdAndStatusOrderByCreatedAtDesc(user.getUserId(), TaskSpaceInvitationStatus.PENDING).stream()
        .map(this::toInvitation)
        .toList();
  }

  public TaskDtos.SpaceInvitationResponse respondToInvitation(String invitationId, TaskDtos.SpaceInvitationActionRequest request, AppUserDetails user) {
    TaskSpaceInvitationEntity invitation = taskSpaceInvitationRepository.findByIdAndInviteeUserId(invitationId, user.getUserId())
        .orElseThrow(() -> new ResourceNotFoundException("Invitation not found."));
    if (invitation.getStatus() != TaskSpaceInvitationStatus.PENDING) {
      throw new BadRequestException("Invitation has already been processed.");
    }
    invitation.setStatus(request.status());
    invitation.setRespondedAt(Instant.now());
    invitation.setUpdatedAt(Instant.now());
    taskSpaceInvitationRepository.save(invitation);

    if (request.status() == TaskSpaceInvitationStatus.ACCEPTED) {
      Instant now = Instant.now();
      TaskSpaceMemberEntity member = new TaskSpaceMemberEntity();
      member.setId(UUID.randomUUID().toString());
      member.setSpace(invitation.getSpace());
      member.setUserId(invitation.getInviteeUserId());
      member.setUserName(invitation.getInviteeName());
      member.setUserEmail(invitation.getInviteeEmail());
      member.setRole(invitation.getRole());
      member.setPermissions(invitation.getPermissions());
      member.setActive(true);
      member.setInvitedById(invitation.getInvitedById());
      member.setInvitedByName(invitation.getInvitedByName());
      member.setJoinedAt(now);
      member.setCreatedAt(now);
      member.setUpdatedAt(now);
      taskSpaceMemberRepository.save(member);
      broadcastSpaceMembers(invitation.getSpace(), "SPACE_MEMBERSHIP_ACCEPTED");
    } else {
      taskSpaceStreamService.publishSpaceUpdate(invitation.getInvitedById(), "SPACE_INVITATION_REJECTED", invitation.getSpace().getId());
    }

    taskSpaceStreamService.publishInvitation(user.getUserId(), "SPACE_INVITATION_UPDATED", invitation.getSpace().getId(), invitation.getId());
    return toInvitation(invitation);
  }

  public TaskDtos.SpaceMemberResponse updateSpaceMember(String spaceId, String memberId, TaskDtos.SpaceMemberUpdateRequest request, AppUserDetails user) {
    TaskSpaceEntity space = requireSpace(spaceId);
    ensureSpaceManager(user, space);
    TaskSpaceMemberEntity member = taskSpaceMemberRepository.findById(memberId)
        .filter(entity -> entity.getSpace().getId().equals(spaceId))
        .orElseThrow(() -> new ResourceNotFoundException("Space member not found."));
    member.setRole(request.role());
    if (request.permissions() != null) {
      member.setPermissions(serializePermissions(resolvePermissions(request.permissions(), request.role())));
    }
    member.setUpdatedAt(Instant.now());
    taskSpaceMemberRepository.save(member);
    broadcastSpaceMembers(space, "SPACE_MEMBER_UPDATED");
    return toSpaceMember(member);
  }

  public void removeSpaceMember(String spaceId, String memberId, AppUserDetails user) {
    TaskSpaceEntity space = requireSpace(spaceId);
    ensureSpaceManager(user, space);
    TaskSpaceMemberEntity member = taskSpaceMemberRepository.findById(memberId)
        .filter(entity -> entity.getSpace().getId().equals(spaceId))
        .orElseThrow(() -> new ResourceNotFoundException("Space member not found."));
    if (member.getRole() == TaskSpaceMemberRole.OWNER) {
      throw new BadRequestException("Space owner cannot be removed.");
    }
    member.setActive(false);
    member.setUpdatedAt(Instant.now());
    taskSpaceMemberRepository.save(member);
    broadcastSpaceMembers(space, "SPACE_MEMBER_REMOVED");
  }

  public SseEmitter subscribe(AppUserDetails user) {
    return taskSpaceStreamService.subscribe(user.getUserId());
  }

  private TaskDtos.TaskDetailResponse createTaskInternal(TaskDtos.TaskRequest request, AppUserDetails user, String parentTaskId) {
    validateTaskDates(request.startDate(), request.dueDate());
    validateAssignee(request.assignedToId(), request.assignedToName());
    Instant now = Instant.now();
    TaskEntity parent = parentTaskId == null ? null : requireTask(parentTaskId);
    TaskSpaceEntity space = resolveManagedSpace(request.spaceId(), user);
    if (parent != null) {
      ensureViewAccess(user, parent);
      if (space == null && StringUtils.hasText(parent.getSpaceId())) {
        space = requireSpace(parent.getSpaceId());
      }
    }

    TaskEntity task = new TaskEntity();
    task.setId(UUID.randomUUID().toString());
    task.setTaskCode(nextTaskCode());
    task.setTitle(request.title().trim());
    task.setDescription(trimToNull(request.description()));
    task.setPriority(request.priority() == null ? TaskPriority.MEDIUM : request.priority());
    task.setStatus(request.status() == null ? TaskStatus.PENDING : request.status());
    task.setApprovalRequired(Boolean.TRUE.equals(request.approvalRequired()));
    task.setApprovalStatus(resolveApprovalStatus(request, false, TaskApprovalStatus.NOT_REQUIRED));
    task.setVisibility(request.visibility() == null ? (parent == null ? TaskVisibility.TEAM : parent.getVisibility()) : request.visibility());
    task.setWorkflowName(trimToNull(firstNonBlank(request.workflowName(), parent == null ? null : parent.getWorkflowName())));
    task.setSpaceId(space == null ? (parent == null ? null : parent.getSpaceId()) : space.getId());
    task.setProjectRef(trimToNull(firstNonBlank(request.projectRef(), parent == null ? null : parent.getProjectRef())));
    task.setModuleRef(trimToNull(firstNonBlank(request.moduleRef(), parent == null ? null : parent.getModuleRef())));
    task.setParentTaskId(parent == null ? null : parent.getId());
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
    task.setHierarchyLevel(parent == null ? 0 : parent.getHierarchyLevel() + 1);
    task.setTaskPath(parent == null ? task.getId() : parent.getTaskPath() + "/" + task.getId());
    task.setOrderIndex(request.orderIndex() == null ? nextOrderIndex(task.getParentTaskId()) : request.orderIndex());
    task.setCreatedAt(now);
    task.setUpdatedAt(now);
    syncChildCollections(task, request, user, now);

    taskRepository.save(task);
    if (StringUtils.hasText(task.getAssignedToId())) {
      saveAssignment(task, user, task.getAssignedToId(), task.getAssignedToName(), task.getAssignedToEmail(), task.getAssignedTeamName(), true, now);
    }
    logActivity(task, TaskActivityType.CREATED, user, parent == null ? "Task created." : "Subtask created.");
    refreshHierarchyMetadata(task);
    return getTask(task.getId(), user);
  }

  private List<TaskEntity> visibleTasks(AppUserDetails user) {
    return taskRepository.findAll().stream()
        .filter(task -> canView(user, task))
        .toList();
  }

  private List<TaskEntity> filteredVisibleTasks(
      String search,
      String status,
      String priority,
      String scope,
      String assigneeId,
      String spaceId,
      String projectRef,
      String moduleRef,
      String approvalStatus,
      Boolean overdue,
      Boolean dueToday,
      AppUserDetails user
  ) {
    List<TaskEntity> visible = visibleTasks(user);
    if (!StringUtils.hasText(search)
        && !StringUtils.hasText(status)
        && !StringUtils.hasText(priority)
        && !StringUtils.hasText(scope)
        && !StringUtils.hasText(assigneeId)
        && !StringUtils.hasText(spaceId)
        && !StringUtils.hasText(projectRef)
        && !StringUtils.hasText(moduleRef)
        && !StringUtils.hasText(approvalStatus)
        && !Boolean.TRUE.equals(overdue)
        && !Boolean.TRUE.equals(dueToday)) {
      return sortHierarchically(visible);
    }

    Predicate<TaskEntity> predicate = buildPredicate(search, status, priority, scope, assigneeId, spaceId, projectRef, moduleRef, approvalStatus, overdue, dueToday, user);
    Set<String> includedIds = new LinkedHashSet<>();
    Map<String, TaskEntity> byId = visible.stream().collect(Collectors.toMap(TaskEntity::getId, task -> task));
    for (TaskEntity task : visible) {
      if (!predicate.test(task)) {
        continue;
      }
      TaskEntity cursor = task;
      while (cursor != null) {
        includedIds.add(cursor.getId());
        cursor = cursor.getParentTaskId() == null ? null : byId.get(cursor.getParentTaskId());
      }
    }
    return sortHierarchically(visible.stream().filter(task -> includedIds.contains(task.getId())).toList());
  }

  private List<TaskEntity> sortHierarchically(Collection<TaskEntity> tasks) {
    TreeContext context = buildTreeContext(tasks, null);
    List<TaskEntity> flattened = new ArrayList<>();
    flattenEntities(context, null, flattened);
    return flattened;
  }

  private void flattenEntities(TreeContext context, String parentTaskId, List<TaskEntity> collector) {
    for (TaskEntity task : context.childrenByParent().getOrDefault(parentTaskId, List.of())) {
      collector.add(task);
      flattenEntities(context, task.getId(), collector);
    }
  }

  private TreeContext buildTreeContext(Collection<TaskEntity> tasks, AppUserDetails user) {
    Map<String, TaskEntity> byId = tasks.stream().collect(Collectors.toMap(TaskEntity::getId, task -> task));
    Map<String, List<TaskEntity>> childrenByParent = new LinkedHashMap<>();
    Map<String, TaskSpaceEntity> spacesById = taskSpaceRepository.findAll().stream()
        .collect(Collectors.toMap(TaskSpaceEntity::getId, space -> space));
    Map<String, TaskSpaceMemberEntity> membershipBySpaceId = user == null
        ? Map.of()
        : taskSpaceMemberRepository.findByUserIdAndActiveTrueOrderByUpdatedAtDesc(user.getUserId()).stream()
            .collect(Collectors.toMap(member -> member.getSpace().getId(), member -> member, (left, right) -> left));
    for (TaskEntity task : tasks) {
      String parentId = byId.containsKey(task.getParentTaskId()) ? task.getParentTaskId() : null;
      childrenByParent.computeIfAbsent(parentId, key -> new ArrayList<>()).add(task);
    }
    childrenByParent.values().forEach(list -> list.sort(Comparator
        .comparingLong(TaskEntity::getOrderIndex)
        .thenComparing(TaskEntity::getCreatedAt)));
    return new TreeContext(byId, childrenByParent, new HashMap<>(), user, spacesById, membershipBySpaceId);
  }

  private List<TaskDtos.TaskSummaryResponse> flattenSummaries(TreeContext context, String parentTaskId) {
    List<TaskDtos.TaskSummaryResponse> flattened = new ArrayList<>();
    for (TaskDtos.TaskSummaryResponse summary : buildSummaries(context, parentTaskId)) {
      flattened.add(summary);
      flattened.addAll(flattenSummaryChildren(summary.subtasks()));
    }
    return flattened;
  }

  private List<TaskDtos.TaskSummaryResponse> flattenSummaryChildren(List<TaskDtos.TaskSummaryResponse> subtasks) {
    List<TaskDtos.TaskSummaryResponse> flattened = new ArrayList<>();
    for (TaskDtos.TaskSummaryResponse summary : subtasks) {
      flattened.add(summary);
      flattened.addAll(flattenSummaryChildren(summary.subtasks()));
    }
    return flattened;
  }

  private List<TaskDtos.TaskSummaryResponse> buildSummaries(TreeContext context, String parentTaskId) {
    return context.childrenByParent().getOrDefault(parentTaskId, List.of()).stream()
        .map(task -> toSummary(task, context))
        .toList();
  }

  private TaskDtos.TaskDetailResponse toDetail(TaskEntity task, TreeContext context) {
    List<TaskDtos.CommentResponse> comments = commentRepository.findByTask_IdOrderByCreatedAtAsc(task.getId()).stream().map(this::toComment).toList();
    List<TaskDtos.ChecklistItemResponse> checklist = checklistRepository.findByTask_IdOrderByCreatedAtAsc(task.getId()).stream().map(this::toChecklist).toList();
    List<TaskDtos.AssignmentHistoryResponse> assignments = assignmentRepository.findByTask_IdOrderByAssignedAtDesc(task.getId()).stream().map(this::toAssignment).toList();
    List<TaskDtos.ActivityResponse> activity = activityRepository.findByTask_IdOrderByCreatedAtAsc(task.getId()).stream().map(this::toActivity).toList();
    List<TaskDtos.TimeLogResponse> timeLogs = timeLogRepository.findByTask_IdOrderByStartedAtDesc(task.getId()).stream().map(this::toTimeLog).toList();
    return new TaskDtos.TaskDetailResponse(
        toSummary(task, context),
        comments,
        checklist,
        task.getAttachments().stream().map(this::toAttachment).toList(),
        task.getDependencies().stream().map(this::toDependency).toList(),
        assignments,
        activity,
        timeLogs,
        buildSummaries(context, task.getId())
    );
  }

  private TaskDtos.TaskSummaryResponse toSummary(TaskEntity task, TreeContext context) {
    int checklistTotal = task.getChecklistItems().size();
    int checklistCompleted = (int) task.getChecklistItems().stream().filter(TaskChecklistItemEntity::isCompleted).count();
    List<TaskDtos.TaskSummaryResponse> subtasks = buildSummaries(context, task.getId());
    TaskSpaceEntity space = context.spacesById().get(task.getSpaceId());
    AppUserDetails user = context.user();
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
        task.getSpaceId(),
        space == null ? null : space.getName(),
        task.getProjectRef(),
        task.getModuleRef(),
        task.getAssignedToId(),
        task.getAssignedToName(),
        task.getAssignedTeamName(),
        task.getParentTaskId(),
        task.getHierarchyLevel(),
        task.getTaskPath(),
        task.getOrderIndex(),
        task.getEstimatedHours(),
        task.getActualHours(),
        task.getTags().stream().map(TaskTagEntity::getName).toList(),
        checklistCompleted,
        checklistTotal,
        subtasks.size(),
        progressPercent(task, context),
        isOverdue(task),
        task.getUpdatedAt(),
        user != null && canEdit(user, task),
        user != null && canManageExecution(user, task),
        subtasks
    );
  }

  private int progressPercent(TaskEntity task, TreeContext context) {
    Integer cached = context.progressMemo().get(task.getId());
    if (cached != null) {
      return cached;
    }
    List<TaskEntity> children = context.childrenByParent().getOrDefault(task.getId(), List.of());
    int progress;
    if (!children.isEmpty()) {
      int total = children.stream().mapToInt(child -> progressPercent(child, context)).sum();
      progress = Math.round((float) total / children.size());
    } else if (!task.getChecklistItems().isEmpty()) {
      long completed = task.getChecklistItems().stream().filter(TaskChecklistItemEntity::isCompleted).count();
      progress = (int) Math.round((completed * 100.0) / task.getChecklistItems().size());
    } else {
      progress = task.getStatus() == TaskStatus.COMPLETED ? 100 : task.getStatus() == TaskStatus.IN_PROGRESS ? 60 : task.getStatus() == TaskStatus.UNDER_REVIEW ? 85 : 0;
    }
    context.progressMemo().put(task.getId(), progress);
    return progress;
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
    return new TaskDtos.DependencyResponse(dependency.getId(), dependency.getDependsOnTaskId(), dependency.getDependsOnTaskCode(), dependency.getDependsOnTitle(), dependency.getRelationshipType());
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
    validateAssignee(request.assignedToId(), request.assignedToName());
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

  private void validateAssignee(String assignedToId, String assignedToName) {
    boolean hasId = StringUtils.hasText(assignedToId);
    boolean hasName = StringUtils.hasText(assignedToName);
    if (hasId != hasName) {
      throw new BadRequestException("Assigned user id and name must be provided together.");
    }
  }

  private void clearAssignee(TaskEntity task) {
    task.setAssignedToId(null);
    task.setAssignedToName(null);
    task.setAssignedToEmail(null);
    task.setAssignedTeamName(null);
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
            entity.setRelationshipType(dep.relationshipType() == null ? TaskRelationshipType.DEPENDS_ON : dep.relationshipType());
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

  private void refreshActualHours(TaskEntity task) {
    BigDecimal total = timeLogRepository.findByTask_IdOrderByStartedAtDesc(task.getId()).stream()
        .map(TaskTimeLogEntity::getDurationHours)
        .filter(Objects::nonNull)
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
    if (StringUtils.hasText(task.getSpaceId()) && !isActiveSpaceMember(task.getSpaceId(), user.getUserId())) {
      return false;
    }
    return equalsNullable(user.getUserId(), task.getCreatedById())
        || equalsNullable(user.getUserId(), task.getAssignedToId())
        || equalsNullable(user.getUserId(), task.getApproverId())
        || StringUtils.hasText(task.getSpaceId());
  }

  private boolean canApprove(AppUserDetails user, TaskEntity task) {
    return hasPrivilegedRole(user) || equalsNullable(user.getUserId(), task.getApproverId());
  }

  private List<TaskSpaceEntity> accessibleSpaces(AppUserDetails user) {
    if (hasPrivilegedRole(user)) {
      return taskSpaceRepository.findByArchivedFalseOrderByUpdatedAtDesc();
    }
    Set<String> ids = taskSpaceMemberRepository.findByUserIdAndActiveTrueOrderByUpdatedAtDesc(user.getUserId()).stream()
        .map(member -> member.getSpace().getId())
        .collect(Collectors.toCollection(LinkedHashSet::new));
    return taskSpaceRepository.findByArchivedFalseOrderByUpdatedAtDesc().stream()
        .filter(space -> ids.contains(space.getId()))
        .toList();
  }

  private TaskSpaceEntity requireSpace(String id) {
    return taskSpaceRepository.findByIdAndArchivedFalse(id)
        .orElseThrow(() -> new ResourceNotFoundException("Space not found."));
  }

  private Optional<TaskSpaceMemberEntity> findActiveSpaceMember(String spaceId, String userId) {
    return taskSpaceMemberRepository.findBySpace_IdAndUserIdAndActiveTrue(spaceId, userId);
  }

  private boolean isActiveSpaceMember(String spaceId, String userId) {
    return taskSpaceMemberRepository.existsBySpace_IdAndUserIdAndActiveTrue(spaceId, userId);
  }

  private void ensureSpaceMember(AppUserDetails user, TaskSpaceEntity space) {
    if (hasPrivilegedRole(user) || isActiveSpaceMember(space.getId(), user.getUserId())) {
      return;
    }
    throw new ForbiddenOperationException("You do not have access to this space.");
  }

  private void ensureSpaceManager(AppUserDetails user, TaskSpaceEntity space) {
    if (hasPrivilegedRole(user)) {
      return;
    }
    if (hasSpacePermission(space.getId(), user.getUserId(), TaskSpacePermission.MANAGE_SPACE_SETTINGS)
        || hasSpacePermission(space.getId(), user.getUserId(), TaskSpacePermission.MANAGE_MEMBERS)
        || hasSpacePermission(space.getId(), user.getUserId(), TaskSpacePermission.INVITE_MEMBERS)) {
      return;
    }
    throw new ForbiddenOperationException("You do not have permission to manage this space.");
  }

  private void ensureSpaceOwner(AppUserDetails user, TaskSpaceEntity space) {
    if (hasPrivilegedRole(user) || equalsNullable(user.getUserId(), space.getOwnerUserId())) {
      return;
    }
    throw new ForbiddenOperationException("Only the space owner can perform this action.");
  }

  private TaskSpaceEntity resolveManagedSpace(String spaceId, AppUserDetails user) {
    if (!StringUtils.hasText(spaceId)) {
      return null;
    }
    TaskSpaceEntity space = requireSpace(spaceId.trim());
    ensureSpaceCreateAccess(user, space);
    return space;
  }

  private void ensureSpaceCreateAccess(AppUserDetails user, TaskSpaceEntity space) {
    if (hasPrivilegedRole(user) || hasSpacePermission(space.getId(), user.getUserId(), TaskSpacePermission.CREATE_TASKS)) {
      return;
    }
    throw new ForbiddenOperationException("You do not have permission to create tasks in this space.");
  }

  private String nextSpaceKey(String rawName) {
    String normalized = rawName.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "-").replaceAll("(^-|-$)", "");
    if (!StringUtils.hasText(normalized)) {
      normalized = "SPACE";
    }
    String candidate = normalized;
    int suffix = 2;
    while (taskSpaceRepository.existsBySpaceKeyIgnoreCase(candidate)) {
      candidate = normalized + "-" + suffix++;
    }
    return candidate;
  }

  private TaskDtos.SpaceSummaryResponse toSpaceSummary(TaskSpaceEntity space, AppUserDetails user) {
    TaskSpaceMemberRole currentRole = hasPrivilegedRole(user)
        ? TaskSpaceMemberRole.ADMIN
        : findActiveSpaceMember(space.getId(), user.getUserId()).map(TaskSpaceMemberEntity::getRole).orElse(null);
    List<TaskEntity> spaceTasks = taskRepository.findAll().stream().filter(task -> space.getId().equals(task.getSpaceId())).toList();
    long pendingCount = spaceTasks.stream().filter(task -> task.getStatus() == TaskStatus.PENDING || task.getStatus() == TaskStatus.ASSIGNED).count();
    long inProgressCount = spaceTasks.stream().filter(task -> task.getStatus() == TaskStatus.IN_PROGRESS).count();
    long completedCount = spaceTasks.stream().filter(task -> task.getStatus() == TaskStatus.COMPLETED).count();
    long overdueCount = spaceTasks.stream().filter(this::isOverdue).count();
    long memberCount = taskSpaceMemberRepository.findBySpace_IdAndActiveTrueOrderByRoleAscUserNameAsc(space.getId()).size();
    long pendingInvitations = taskSpaceInvitationRepository.findBySpace_IdOrderByCreatedAtDesc(space.getId()).stream()
        .filter(invitation -> invitation.getStatus() == TaskSpaceInvitationStatus.PENDING)
        .count();
    return new TaskDtos.SpaceSummaryResponse(
        space.getId(),
        space.getSpaceKey(),
        space.getName(),
        space.getDescription(),
        space.getIconName(),
        space.getColorHex(),
        space.getVisibility(),
        space.getOwnerUserId(),
        space.getOwnerUserName(),
        currentRole,
        space.isArchived(),
        pendingCount,
        inProgressCount,
        completedCount,
        overdueCount,
        memberCount,
        pendingInvitations,
        space.getUpdatedAt()
    );
  }

  private TaskDtos.SpaceMemberResponse toSpaceMember(TaskSpaceMemberEntity member) {
    return new TaskDtos.SpaceMemberResponse(
        member.getId(),
        member.getUserId(),
        member.getUserName(),
        member.getUserEmail(),
        member.getRole(),
        parsePermissions(member.getPermissions(), member.getRole()),
        member.isActive(),
        member.getInvitedByName(),
        member.getJoinedAt()
    );
  }

  private TaskDtos.SpaceInvitationResponse toInvitation(TaskSpaceInvitationEntity invitation) {
    return new TaskDtos.SpaceInvitationResponse(
        invitation.getId(),
        invitation.getSpace().getId(),
        invitation.getSpace().getName(),
        invitation.getInviteeUserId(),
        invitation.getInviteeName(),
        invitation.getInviteeEmail(),
        invitation.getInvitedById(),
        invitation.getInvitedByName(),
        invitation.getRole(),
        parsePermissions(invitation.getPermissions(), invitation.getRole()),
        invitation.getStatus(),
        invitation.getMessage(),
        invitation.getRespondedAt(),
        invitation.getCreatedAt()
    );
  }

  private void broadcastSpaceMembers(TaskSpaceEntity space, String eventType) {
    taskSpaceMemberRepository.findBySpace_IdAndActiveTrueOrderByRoleAscUserNameAsc(space.getId()).forEach(member ->
        taskSpaceStreamService.publishSpaceUpdate(member.getUserId(), eventType, space.getId())
    );
  }

  private void ensureViewAccess(AppUserDetails user, TaskEntity task) {
    if (!canView(user, task)) {
      throw new ForbiddenOperationException("You do not have access to this task.");
    }
  }

  private void ensureEditAccess(AppUserDetails user, TaskEntity task) {
    if (canEdit(user, task)) {
      return;
    }
    throw new ForbiddenOperationException("You do not have permission to modify this task.");
  }

  private void ensureExecutionAccess(AppUserDetails user, TaskEntity task) {
    if (canManageExecution(user, task)) {
      return;
    }
    throw new ForbiddenOperationException("You do not have permission to update this task status.");
  }

  private boolean canEdit(AppUserDetails user, TaskEntity task) {
    if (hasPrivilegedRole(user)
        || equalsNullable(user.getUserId(), task.getCreatedById())
        || equalsNullable(user.getUserId(), task.getAssignedById())) {
      return true;
    }
    if (!StringUtils.hasText(task.getSpaceId())) {
      return false;
    }
    return hasSpacePermission(task.getSpaceId(), user.getUserId(), TaskSpacePermission.EDIT_TASKS);
  }

  private boolean canManageExecution(AppUserDetails user, TaskEntity task) {
    return canEdit(user, task)
        || equalsNullable(user.getUserId(), task.getAssignedToId())
        || hasSpacePermission(task.getSpaceId(), user.getUserId(), TaskSpacePermission.UPDATE_STATUS)
        || hasSpacePermission(task.getSpaceId(), user.getUserId(), TaskSpacePermission.ADD_COMMENTS)
        || hasSpacePermission(task.getSpaceId(), user.getUserId(), TaskSpacePermission.UPDATE_CHECKLIST);
  }

  private boolean hasSpacePermission(String spaceId, String userId, TaskSpacePermission permission) {
    if (!StringUtils.hasText(spaceId) || !StringUtils.hasText(userId)) {
      return false;
    }
    return findActiveSpaceMember(spaceId, userId)
        .map(member -> parsePermissions(member.getPermissions(), member.getRole()).contains(permission))
        .orElse(false);
  }

  private List<TaskSpacePermission> parsePermissions(String rawPermissions, TaskSpaceMemberRole role) {
    if (!StringUtils.hasText(rawPermissions)) {
      return new ArrayList<>(defaultPermissionsForRole(role));
    }
    return java.util.Arrays.stream(rawPermissions.split(","))
        .map(String::trim)
        .filter(StringUtils::hasText)
        .map(value -> TaskSpacePermission.valueOf(value.toUpperCase(Locale.ROOT)))
        .distinct()
        .toList();
  }

  private List<TaskSpacePermission> resolvePermissions(List<TaskSpacePermission> requested, TaskSpaceMemberRole role) {
    TaskSpaceMemberRole resolvedRole = role == null ? TaskSpaceMemberRole.MEMBER : role;
    if (requested == null || requested.isEmpty()) {
      return new ArrayList<>(defaultPermissionsForRole(resolvedRole));
    }
    EnumSet<TaskSpacePermission> permissions = EnumSet.copyOf(requested);
    if (resolvedRole == TaskSpaceMemberRole.OWNER || resolvedRole == TaskSpaceMemberRole.ADMIN || resolvedRole == TaskSpaceMemberRole.PROJECT_MANAGER) {
      permissions.addAll(defaultPermissionsForRole(resolvedRole));
    }
    return permissions.stream().distinct().toList();
  }

  private String serializePermissions(Collection<TaskSpacePermission> permissions) {
    if (permissions == null || permissions.isEmpty()) {
      return null;
    }
    return permissions.stream().map(TaskSpacePermission::name).distinct().collect(Collectors.joining(","));
  }

  private EnumSet<TaskSpacePermission> defaultPermissionsForRole(TaskSpaceMemberRole role) {
    if (role == null) {
      return EnumSet.of(TaskSpacePermission.UPDATE_STATUS, TaskSpacePermission.ADD_COMMENTS, TaskSpacePermission.UPDATE_CHECKLIST);
    }
    return switch (role) {
      case OWNER, ADMIN, PROJECT_MANAGER -> EnumSet.copyOf(ALL_SPACE_PERMISSIONS);
      case MEMBER -> EnumSet.of(
          TaskSpacePermission.CREATE_TASKS,
          TaskSpacePermission.UPDATE_STATUS,
          TaskSpacePermission.ADD_COMMENTS,
          TaskSpacePermission.UPDATE_CHECKLIST,
          TaskSpacePermission.UPLOAD_ATTACHMENTS
      );
      case VIEWER -> EnumSet.noneOf(TaskSpacePermission.class);
    };
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
      String spaceId,
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
    if (StringUtils.hasText(spaceId)) {
      predicates.add(task -> spaceId.trim().equals(task.getSpaceId()));
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

  private void reparent(TaskEntity task, String newParentTaskId) {
    if (Objects.equals(task.getParentTaskId(), newParentTaskId)) {
      return;
    }
    if (Objects.equals(task.getId(), newParentTaskId)) {
      throw new BadRequestException("A task cannot be its own parent.");
    }
    if (newParentTaskId != null) {
      TaskEntity newParent = requireTask(newParentTaskId);
      if (newParent.getTaskPath() != null && newParent.getTaskPath().startsWith(task.getTaskPath() + "/")) {
        throw new BadRequestException("A task cannot be moved under one of its descendants.");
      }
      task.setParentTaskId(newParentTaskId);
      task.setHierarchyLevel(newParent.getHierarchyLevel() + 1);
      task.setTaskPath(newParent.getTaskPath() + "/" + task.getId());
      if (task.getOrderIndex() <= 0) {
        task.setOrderIndex(nextOrderIndex(newParentTaskId));
      }
    } else {
      task.setParentTaskId(null);
      task.setHierarchyLevel(0);
      task.setTaskPath(task.getId());
      if (task.getOrderIndex() <= 0) {
        task.setOrderIndex(nextOrderIndex(null));
      }
    }
  }

  private void refreshHierarchyMetadata(TaskEntity rootTask) {
    Map<String, TaskEntity> allTasks = taskRepository.findAll().stream().collect(Collectors.toMap(TaskEntity::getId, task -> task));
    updateDescendantPaths(rootTask, allTasks);
  }

  private void updateDescendantPaths(TaskEntity task, Map<String, TaskEntity> allTasks) {
    List<TaskEntity> children = allTasks.values().stream()
        .filter(candidate -> Objects.equals(task.getId(), candidate.getParentTaskId()))
        .sorted(Comparator.comparingLong(TaskEntity::getOrderIndex).thenComparing(TaskEntity::getCreatedAt))
        .toList();
    for (TaskEntity child : children) {
      child.setHierarchyLevel(task.getHierarchyLevel() + 1);
      child.setTaskPath(task.getTaskPath() + "/" + child.getId());
      taskRepository.save(child);
      updateDescendantPaths(child, allTasks);
    }
  }

  private long nextOrderIndex(String parentTaskId) {
    List<TaskEntity> siblings = parentTaskId == null
        ? taskRepository.findByParentTaskIdIsNullOrderByOrderIndexAscCreatedAtAsc()
        : taskRepository.findByParentTaskIdOrderByOrderIndexAscCreatedAtAsc(parentTaskId);
    return siblings.isEmpty() ? ORDER_INCREMENT : siblings.get(siblings.size() - 1).getOrderIndex() + ORDER_INCREMENT;
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

  private String firstNonBlank(String preferred, String fallback) {
    return StringUtils.hasText(preferred) ? preferred : fallback;
  }

  private String readable(String value) {
    return value.toLowerCase(Locale.ROOT).replace('_', ' ');
  }

  private record TreeContext(
      Map<String, TaskEntity> byId,
      Map<String, List<TaskEntity>> childrenByParent,
      Map<String, Integer> progressMemo,
      AppUserDetails user,
      Map<String, TaskSpaceEntity> spacesById,
      Map<String, TaskSpaceMemberEntity> membershipBySpaceId
  ) {
  }
}
