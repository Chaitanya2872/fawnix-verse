package com.fawnix.project.meetings.controller;

import com.fawnix.project.meetings.dto.ProjectMeetingDtos;
import com.fawnix.project.meetings.service.ProjectMeetingService;
import com.fawnix.project.security.service.AppUserDetails;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/project-meetings")
public class ProjectMeetingController {

  private final ProjectMeetingService meetingService;

  public ProjectMeetingController(ProjectMeetingService meetingService) {
    this.meetingService = meetingService;
  }

  @GetMapping
  public List<ProjectMeetingDtos.ProjectMeetingResponse> listMeetings(
      @RequestParam(required = false) String projectId
  ) {
    return meetingService.listMeetings(projectId);
  }

  @GetMapping("/{id}")
  public ProjectMeetingDtos.ProjectMeetingResponse getMeeting(@PathVariable String id) {
    return meetingService.getMeeting(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProjectMeetingDtos.ProjectMeetingResponse createMeeting(
      @Valid @RequestBody ProjectMeetingDtos.ProjectMeetingRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return meetingService.createMeeting(request, user);
  }

  @PutMapping("/{id}")
  public ProjectMeetingDtos.ProjectMeetingResponse updateMeeting(
      @PathVariable String id,
      @Valid @RequestBody ProjectMeetingDtos.ProjectMeetingRequest request
  ) {
    return meetingService.updateMeeting(id, request);
  }

  @PatchMapping("/{id}/status")
  public ProjectMeetingDtos.ProjectMeetingResponse updateStatus(
      @PathVariable String id,
      @Valid @RequestBody ProjectMeetingDtos.MeetingStatusRequest request
  ) {
    return meetingService.updateStatus(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteMeeting(@PathVariable String id) {
    meetingService.deleteMeeting(id);
  }
}
