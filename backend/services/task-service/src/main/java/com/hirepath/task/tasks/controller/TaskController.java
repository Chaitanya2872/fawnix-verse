package com.hirepath.task.tasks.controller;

import com.hirepath.task.security.service.AppUserDetails;
import com.hirepath.task.tasks.dto.TaskDtos;
import com.hirepath.task.tasks.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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
      @RequestParam(required = false) String projectRef,
      @RequestParam(required = false) String moduleRef,
      @RequestParam(required = false) String approvalStatus,
      @RequestParam(required = false) Boolean overdue,
      @RequestParam(required = false) Boolean dueToday,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "20") int pageSize,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.listTasks(search, status, priority, scope, assigneeId, projectRef, moduleRef, approvalStatus, overdue, dueToday, page, pageSize, user);
  }

  @GetMapping("/{id}")
  public TaskDtos.TaskDetailResponse getTask(
      @PathVariable String id,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.getTask(id, user);
  }

  @PutMapping("/{id}")
  public TaskDtos.TaskDetailResponse updateTask(
      @PathVariable String id,
      @Valid @RequestBody TaskDtos.TaskRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return taskService.updateTask(id, request, user);
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
}
