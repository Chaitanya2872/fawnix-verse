package com.hirepath.task.tasks.controller;

import com.hirepath.task.security.service.AppUserDetails;
import com.hirepath.task.tasks.dto.TaskDtos;
import com.hirepath.task.tasks.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

  private final TaskService taskService;

  public TaskController(TaskService taskService) {
    this.taskService = taskService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public TaskDtos.TaskDetailResponse createTask(
      @Valid @RequestBody TaskDtos.TaskRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.createTask(request, user);
  }

  @GetMapping
  public TaskDtos.TaskListResponse listTasks(
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String priority,
      @RequestParam(required = false) String scope,
      @RequestParam(required = false) String assigneeId,
      @RequestParam(required = false) String spaceId,
      @RequestParam(required = false) String projectRef,
      @RequestParam(required = false) String moduleRef,
      @RequestParam(required = false) String approvalStatus,
      @RequestParam(required = false) Boolean overdue,
      @RequestParam(required = false) Boolean dueToday,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "20") int pageSize,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.listTasks(search, status, priority, scope, assigneeId, spaceId, projectRef, moduleRef, approvalStatus, overdue, dueToday, page, pageSize, user);
  }

  @GetMapping("/tree")
  public TaskDtos.TaskTreeResponse tree(
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String priority,
      @RequestParam(required = false) String scope,
      @RequestParam(required = false) String assigneeId,
      @RequestParam(required = false) String spaceId,
      @RequestParam(required = false) String projectRef,
      @RequestParam(required = false) String moduleRef,
      @RequestParam(required = false) String approvalStatus,
      @RequestParam(required = false) Boolean overdue,
      @RequestParam(required = false) Boolean dueToday,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.treeTasks(search, status, priority, scope, assigneeId, spaceId, projectRef, moduleRef, approvalStatus, overdue, dueToday, user);
  }

  @GetMapping("/{id}")
  public TaskDtos.TaskDetailResponse getTask(
      @PathVariable String id,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.getTask(id, user);
  }

  @GetMapping("/{id}/subtasks")
  public TaskDtos.TaskTreeResponse getSubtasks(
      @PathVariable String id,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.getSubtasks(id, user);
  }

  @PutMapping("/{id}")
  public TaskDtos.TaskDetailResponse updateTask(
      @PathVariable String id,
      @Valid @RequestBody TaskDtos.TaskRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.updateTask(id, request, user);
  }

  @PutMapping("/{id}/status")
  public TaskDtos.TaskDetailResponse updateTaskStatus(
      @PathVariable String id,
      @Valid @RequestBody TaskDtos.TaskStatusUpdateRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.updateTaskStatus(id, request, user);
  }

  @PutMapping("/{id}/hierarchy")
  public TaskDtos.TaskDetailResponse reorderHierarchy(
      @PathVariable String id,
      @RequestBody TaskDtos.ReorderHierarchyRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.reorderHierarchy(id, request, user);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteTask(
      @PathVariable String id,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    taskService.deleteTask(id, user);
  }

  @PostMapping("/{id}/comments")
  @ResponseStatus(HttpStatus.CREATED)
  public TaskDtos.CommentResponse addComment(
      @PathVariable String id,
      @Valid @RequestBody TaskDtos.CommentCreateRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.addComment(id, request, user);
  }

  @GetMapping("/{id}/comments")
  public java.util.List<TaskDtos.CommentResponse> listComments(
      @PathVariable String id,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.listComments(id, user);
  }

  @PostMapping("/{id}/checklist")
  @ResponseStatus(HttpStatus.CREATED)
  public TaskDtos.ChecklistItemResponse addChecklistItem(
      @PathVariable String id,
      @Valid @RequestBody TaskDtos.ChecklistItemCreateRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.addChecklistItem(id, request, user);
  }

  @PostMapping("/{id}/subtasks")
  @ResponseStatus(HttpStatus.CREATED)
  public TaskDtos.TaskDetailResponse addSubtask(
      @PathVariable String id,
      @Valid @RequestBody TaskDtos.TaskRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.addSubtask(id, request, user);
  }

  @PutMapping("/{id}/checklist/{itemId}")
  public TaskDtos.ChecklistItemResponse updateChecklistItem(
      @PathVariable String id,
      @PathVariable String itemId,
      @Valid @RequestBody TaskDtos.ChecklistItemUpdateRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.updateChecklistItem(id, itemId, request, user);
  }

  @PostMapping("/{id}/assign")
  public TaskDtos.TaskDetailResponse assignTask(
      @PathVariable String id,
      @Valid @RequestBody TaskDtos.AssignmentRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.assignTask(id, request, user, false);
  }

  @PostMapping("/{id}/reassign")
  public TaskDtos.TaskDetailResponse reassignTask(
      @PathVariable String id,
      @Valid @RequestBody TaskDtos.AssignmentRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.assignTask(id, request, user, true);
  }

  @PostMapping("/{id}/approve")
  public TaskDtos.TaskDetailResponse approveTask(
      @PathVariable String id,
      @RequestBody(required = false) TaskDtos.ApprovalActionRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.approveTask(id, request == null ? new TaskDtos.ApprovalActionRequest(null, false) : request, user, true);
  }

  @PostMapping("/{id}/reject")
  public TaskDtos.TaskDetailResponse rejectTask(
      @PathVariable String id,
      @RequestBody(required = false) TaskDtos.ApprovalActionRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.approveTask(id, request == null ? new TaskDtos.ApprovalActionRequest(null, false) : request, user, false);
  }

  @PostMapping("/{id}/start-timer")
  public TaskDtos.TimeLogResponse startTimer(
      @PathVariable String id,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.startTimer(id, user);
  }

  @PostMapping("/{id}/stop-timer")
  public TaskDtos.TimeLogResponse stopTimer(
      @PathVariable String id,
      @RequestBody(required = false) TaskDtos.StopTimerRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.stopTimer(id, request == null ? new TaskDtos.StopTimerRequest(null, null, null) : request, user);
  }

  @GetMapping("/dashboard")
  public TaskDtos.DashboardResponse dashboard(@AuthenticationPrincipal AppUserDetails user) {
    return taskService.dashboard(user);
  }

  @GetMapping("/reports/completion")
  public TaskDtos.TaskReportResponse completionReport(
      @RequestParam(required = false) java.time.LocalDate fromDate,
      @RequestParam(required = false) java.time.LocalDate toDate,
      @RequestParam(required = false) String spaceId,
      @RequestParam(required = false) String projectRef,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.completionReport(fromDate, toDate, spaceId, projectRef, user);
  }

  @GetMapping("/spaces")
  public java.util.List<TaskDtos.SpaceSummaryResponse> listSpaces(@AuthenticationPrincipal AppUserDetails user) {
    return taskService.listSpaces(user);
  }

  @PostMapping("/spaces")
  @ResponseStatus(HttpStatus.CREATED)
  public TaskDtos.SpaceDetailResponse createSpace(
      @Valid @RequestBody TaskDtos.SpaceCreateRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.createSpace(request, user);
  }

  @GetMapping("/spaces/{spaceId}")
  public TaskDtos.SpaceDetailResponse getSpace(@PathVariable String spaceId, @AuthenticationPrincipal AppUserDetails user) {
    return taskService.getSpace(spaceId, user);
  }

  @PutMapping("/spaces/{spaceId}")
  public TaskDtos.SpaceDetailResponse updateSpace(
      @PathVariable String spaceId,
      @RequestBody TaskDtos.SpaceUpdateRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.updateSpace(spaceId, request, user);
  }

  @DeleteMapping("/spaces/{spaceId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteSpace(@PathVariable String spaceId, @AuthenticationPrincipal AppUserDetails user) {
    taskService.deleteSpace(spaceId, user);
  }

  @PostMapping("/spaces/{spaceId}/invitations")
  @ResponseStatus(HttpStatus.CREATED)
  public TaskDtos.SpaceInvitationResponse inviteToSpace(
      @PathVariable String spaceId,
      @Valid @RequestBody TaskDtos.SpaceInvitationRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.inviteToSpace(spaceId, request, user);
  }

  @GetMapping("/spaces/invitations")
  public java.util.List<TaskDtos.SpaceInvitationResponse> myInvitations(@AuthenticationPrincipal AppUserDetails user) {
    return taskService.listMyInvitations(user);
  }

  @PutMapping("/spaces/invitations/{invitationId}")
  public TaskDtos.SpaceInvitationResponse respondToInvitation(
      @PathVariable String invitationId,
      @Valid @RequestBody TaskDtos.SpaceInvitationActionRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.respondToInvitation(invitationId, request, user);
  }

  @PutMapping("/spaces/{spaceId}/members/{memberId}")
  public TaskDtos.SpaceMemberResponse updateMemberRole(
      @PathVariable String spaceId,
      @PathVariable String memberId,
      @Valid @RequestBody TaskDtos.SpaceMemberUpdateRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.updateSpaceMember(spaceId, memberId, request, user);
  }

  @DeleteMapping("/spaces/{spaceId}/members/{memberId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removeMember(
      @PathVariable String spaceId,
      @PathVariable String memberId,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    taskService.removeSpaceMember(spaceId, memberId, user);
  }

  @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter stream(@AuthenticationPrincipal AppUserDetails user) {
    return taskService.subscribe(user);
  }
}
