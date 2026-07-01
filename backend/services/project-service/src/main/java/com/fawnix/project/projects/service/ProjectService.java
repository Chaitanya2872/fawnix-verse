package com.fawnix.project.projects.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fawnix.project.projects.domain.ProjectEntity;
import com.fawnix.project.projects.domain.ProjectStatus;
import com.fawnix.project.projects.dto.ProjectDtos;
import com.fawnix.project.projects.repository.ProjectRepository;
import com.fawnix.project.security.service.AppUserDetails;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProjectService {

  private final ProjectRepository projectRepository;
  private final ObjectMapper objectMapper;

  public ProjectService(ProjectRepository projectRepository, ObjectMapper objectMapper) {
    this.projectRepository = projectRepository;
    this.objectMapper = objectMapper;
  }

  @Transactional(readOnly = true)
  public List<ProjectDtos.ProjectResponse> listProjects() {
    return projectRepository.findAllByOrderByUpdatedAtDescCreatedAtDesc().stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public ProjectDtos.ProjectResponse getProject(String id) {
    return toResponse(requireProject(id));
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

    return toResponse(projectRepository.save(entity));
  }

  public ProjectDtos.ProjectResponse updateProject(String id, ProjectDtos.ProjectRequest request) {
    validateDates(request);

    ProjectEntity entity = requireProject(id);
    applyRequest(entity, request);

    return toResponse(projectRepository.save(entity));
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
    entity.setTeamLeadName(trimToNull(request.teamLeadName()));
    entity.setPriorityLevel(trimToNull(request.priority()));
    entity.setProgressPercent(normalizeProgress(request.progress()));
    entity.setTeamSize(normalizeTeamSize(request.teamSize(), request.teamMembers()));
    entity.setTeamMembersPayload(writeJson(request.teamMembers()));
    entity.setTeamPayload(writeJson(request.team()));
    entity.setDetailsPayload(writeJson(request.details()));
    entity.setStartDate(request.startDate());
    entity.setTargetEndDate(request.targetEndDate());
  }

  private ProjectDtos.ProjectResponse toResponse(ProjectEntity entity) {
    return new ProjectDtos.ProjectResponse(
        entity.getId(),
        entity.getProjectCode(),
        entity.getName(),
        entity.getDescription(),
        entity.getStatus(),
        entity.getDepartment(),
        entity.getManagerName(),
        entity.getTeamLeadName(),
        entity.getPriorityLevel(),
        entity.getProgressPercent(),
        entity.getTeamSize(),
        readTeamMembers(entity.getTeamMembersPayload()),
        readTeam(entity.getTeamPayload()),
        readJsonNode(entity.getDetailsPayload()),
        entity.getStartDate(),
        entity.getTargetEndDate(),
        entity.getCreatedAt(),
        entity.getUpdatedAt()
    );
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

  private Integer normalizeTeamSize(Integer teamSize, List<String> teamMembers) {
    if (teamSize != null) {
      return Math.max(0, teamSize);
    }
    return teamMembers == null ? 0 : Math.max(0, teamMembers.size());
  }

  private String writeJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value == null ? Collections.emptyList() : value);
    } catch (JsonProcessingException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to store team data.", exception);
    }
  }

  private List<String> readTeamMembers(String payload) {
    if (payload == null || payload.isBlank()) {
      return List.of();
    }
    try {
      return objectMapper.readValue(payload, new TypeReference<List<String>>() { });
    } catch (JsonProcessingException exception) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to read team members.", exception);
    }
  }

  private List<ProjectDtos.TeamMemberPayload> readTeam(String payload) {
    if (payload == null || payload.isBlank()) {
      return List.of();
    }
    try {
      return objectMapper.readValue(payload, new TypeReference<List<ProjectDtos.TeamMemberPayload>>() { });
    } catch (JsonProcessingException exception) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to read team details.", exception);
    }
  }

  private JsonNode readJsonNode(String payload) {
    if (payload == null || payload.isBlank()) {
      return null;
    }
    try {
      return objectMapper.readTree(payload);
    } catch (JsonProcessingException exception) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to read project details.", exception);
    }
  }
}
