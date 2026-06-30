package com.fawnix.project.projects.service;

import com.fawnix.project.projects.domain.ProjectEntity;
import com.fawnix.project.projects.domain.ProjectStatus;
import com.fawnix.project.projects.dto.ProjectDtos;
import com.fawnix.project.projects.repository.ProjectRepository;
import com.fawnix.project.security.service.AppUserDetails;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProjectService {

  private final ProjectRepository projectRepository;

  public ProjectService(ProjectRepository projectRepository) {
    this.projectRepository = projectRepository;
  }

  @Transactional(readOnly = true)
  public List<ProjectDtos.ProjectResponse> listProjects() {
    return projectRepository.findAllByOrderByUpdatedAtDescCreatedAtDesc().stream()
        .map(ProjectDtos.ProjectResponse::fromEntity)
        .toList();
  }

  @Transactional(readOnly = true)
  public ProjectDtos.ProjectResponse getProject(String id) {
    return ProjectDtos.ProjectResponse.fromEntity(requireProject(id));
  }

  public ProjectDtos.ProjectResponse createProject(ProjectDtos.ProjectRequest request, AppUserDetails user) {
    validateDates(request);

    ProjectEntity entity = new ProjectEntity();
    applyRequest(entity, request);
    entity.setStatus(ProjectStatus.PENDING_CREATION_APPROVAL);
    if (user != null) {
      entity.setCreatedById(user.getUserId());
      entity.setCreatedByName(trimToNull(user.getFullName()));
    }

    return ProjectDtos.ProjectResponse.fromEntity(projectRepository.save(entity));
  }

  public ProjectDtos.ProjectResponse updateProject(String id, ProjectDtos.ProjectRequest request) {
    validateDates(request);

    ProjectEntity entity = requireProject(id);
    applyRequest(entity, request);

    return ProjectDtos.ProjectResponse.fromEntity(projectRepository.save(entity));
  }

  @Transactional(readOnly = true)
  public ProjectDtos.ProjectSummaryResponse getSummary() {
    List<ProjectEntity> projects = projectRepository.findAll();
    LocalDate today = LocalDate.now();

    long total = projects.size();
    long active = projects.stream()
        .filter(project -> project.getStatus() == ProjectStatus.IN_PROGRESS || project.getStatus() == ProjectStatus.REOPENED)
        .count();
    long completed = projects.stream()
        .filter(project -> project.getStatus() == ProjectStatus.COMPLETED)
        .count();
    long pendingApproval = projects.stream()
        .filter(project -> project.getStatus() == ProjectStatus.PENDING_CREATION_APPROVAL)
        .count();
    long overdue = projects.stream()
        .filter(project -> project.getTargetEndDate() != null)
        .filter(project -> project.getStatus() != ProjectStatus.COMPLETED)
        .filter(project -> project.getTargetEndDate().isBefore(today))
        .count();

    return new ProjectDtos.ProjectSummaryResponse(total, active, completed, pendingApproval, overdue);
  }

  private void applyRequest(ProjectEntity entity, ProjectDtos.ProjectRequest request) {
    entity.setProjectCode(trimToNull(request.projectCode()));
    entity.setName(request.name().trim());
    entity.setDescription(trimToNull(request.description()));
    entity.setDepartment(trimToNull(request.department()));
    entity.setManagerName(trimToNull(request.managerName()));
    entity.setPriorityLevel(trimToNull(request.priority()));
    entity.setProgressPercent(normalizeProgress(request.progress()));
    entity.setTeamSize(normalizeTeamSize(request.teamSize()));
    entity.setStartDate(request.startDate());
    entity.setTargetEndDate(request.targetEndDate());
  }

  private ProjectEntity requireProject(String id) {
    return projectRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found."));
  }

  private void validateDates(ProjectDtos.ProjectRequest request) {
    if (request.targetEndDate().isBefore(request.startDate())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target end date cannot be before start date.");
    }
  }

  private String trimToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private Integer normalizeProgress(Integer progress) {
    if (progress == null) {
      return 0;
    }
    return Math.max(0, Math.min(100, progress));
  }

  private Integer normalizeTeamSize(Integer teamSize) {
    if (teamSize == null) {
      return 0;
    }
    return Math.max(0, teamSize);
  }
}
