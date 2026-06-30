package com.fawnix.project.projects.controller;

import com.fawnix.project.projects.dto.ProjectDtos;
import com.fawnix.project.projects.service.ProjectService;
import com.fawnix.project.security.service.AppUserDetails;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

  private final ProjectService projectService;

  public ProjectController(ProjectService projectService) {
    this.projectService = projectService;
  }

  @GetMapping
  public List<ProjectDtos.ProjectResponse> listProjects() {
    return projectService.listProjects();
  }

  @GetMapping("/summary")
  public ProjectDtos.ProjectSummaryResponse getSummary() {
    return projectService.getSummary();
  }

  @GetMapping("/{id}")
  public ProjectDtos.ProjectResponse getProject(@PathVariable String id) {
    return projectService.getProject(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProjectDtos.ProjectResponse createProject(
      @Valid @RequestBody ProjectDtos.ProjectRequest request,
      @AuthenticationPrincipal AppUserDetails user
  ) {
    return projectService.createProject(request, user);
  }

  @PutMapping("/{id}")
  public ProjectDtos.ProjectResponse updateProject(
      @PathVariable String id,
      @Valid @RequestBody ProjectDtos.ProjectRequest request
  ) {
    return projectService.updateProject(id, request);
  }
}
