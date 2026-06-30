package com.fawnix.project.projects.service;

import com.fawnix.project.projects.domain.ProjectEntity;
import com.fawnix.project.projects.domain.ProjectStatus;
import com.fawnix.project.projects.dto.ProjectDtos;
import com.fawnix.project.projects.repository.ProjectRepository;
import com.fawnix.project.security.service.AppUserDetails;
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
    entity.setName(request.name().trim());
    entity.setDescription(trimToNull(request.description()));
    entity.setStatus(ProjectStatus.PENDING_CREATION_APPROVAL);
    entity.setStartDate(request.startDate());
    entity.setTargetEndDate(request.targetEndDate());
    if (user != null) {
      entity.setCreatedById(user.getUserId());
      entity.setCreatedByName(trimToNull(user.getFullName()));
    }

    return ProjectDtos.ProjectResponse.fromEntity(projectRepository.save(entity));
  }

  public ProjectDtos.ProjectResponse updateProject(String id, ProjectDtos.ProjectRequest request) {
    validateDates(request);

    ProjectEntity entity = requireProject(id);
    entity.setName(request.name().trim());
    entity.setDescription(trimToNull(request.description()));
    entity.setStartDate(request.startDate());
    entity.setTargetEndDate(request.targetEndDate());

    return ProjectDtos.ProjectResponse.fromEntity(projectRepository.save(entity));
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
}
