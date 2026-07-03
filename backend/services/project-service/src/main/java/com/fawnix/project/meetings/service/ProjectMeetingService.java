package com.fawnix.project.meetings.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fawnix.project.meetings.domain.ProjectMeetingEntity;
import com.fawnix.project.meetings.domain.ProjectMeetingStatus;
import com.fawnix.project.meetings.dto.ProjectMeetingDtos;
import com.fawnix.project.meetings.repository.ProjectMeetingRepository;
import com.fawnix.project.projects.domain.ProjectEntity;
import com.fawnix.project.projects.repository.ProjectRepository;
import com.fawnix.project.security.service.AppUserDetails;
import java.util.Collections;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProjectMeetingService {

  private final ProjectMeetingRepository meetingRepository;
  private final ProjectRepository projectRepository;
  private final ObjectMapper objectMapper;

  public ProjectMeetingService(
      ProjectMeetingRepository meetingRepository,
      ProjectRepository projectRepository,
      ObjectMapper objectMapper
  ) {
    this.meetingRepository = meetingRepository;
    this.projectRepository = projectRepository;
    this.objectMapper = objectMapper;
  }

  @Transactional(readOnly = true)
  public List<ProjectMeetingDtos.ProjectMeetingResponse> listMeetings(String projectId) {
    List<ProjectMeetingEntity> meetings = trimToNull(projectId) == null
        ? meetingRepository.findAllByOrderByStartAtAscCreatedAtDesc()
        : meetingRepository.findAllByProjectIdOrderByStartAtAscCreatedAtDesc(projectId.trim());

    return meetings.stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public ProjectMeetingDtos.ProjectMeetingResponse getMeeting(String id) {
    return toResponse(requireMeeting(id));
  }

  public ProjectMeetingDtos.ProjectMeetingResponse createMeeting(
      ProjectMeetingDtos.ProjectMeetingRequest request,
      AppUserDetails user
  ) {
    validateRequest(request);

    ProjectMeetingEntity entity = new ProjectMeetingEntity();
    applyRequest(entity, request);
    if (user != null) {
      entity.setCreatedById(user.getUserId());
      entity.setCreatedByName(trimToNull(user.getFullName()));
    }

    return toResponse(meetingRepository.save(entity));
  }

  public ProjectMeetingDtos.ProjectMeetingResponse updateMeeting(
      String id,
      ProjectMeetingDtos.ProjectMeetingRequest request
  ) {
    validateRequest(request);

    ProjectMeetingEntity entity = requireMeeting(id);
    applyRequest(entity, request);

    return toResponse(meetingRepository.save(entity));
  }

  public ProjectMeetingDtos.ProjectMeetingResponse updateStatus(
      String id,
      ProjectMeetingDtos.MeetingStatusRequest request
  ) {
    ProjectMeetingEntity entity = requireMeeting(id);
    entity.setStatus(request.status());

    return toResponse(meetingRepository.save(entity));
  }

  public void deleteMeeting(String id) {
    ProjectMeetingEntity entity = requireMeeting(id);
    meetingRepository.delete(entity);
  }

  private void applyRequest(ProjectMeetingEntity entity, ProjectMeetingDtos.ProjectMeetingRequest request) {
    ProjectEntity project = resolveProject(request.projectId());

    if (project == null && trimToNull(request.projectName()) == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project is required.");
    }

    entity.setProjectId(project == null ? trimToNull(request.projectId()) : project.getId());
    entity.setProjectName(project == null ? trimToNull(request.projectName()) : project.getName());
    entity.setProjectCode(project == null ? trimToNull(request.projectCode()) : project.getProjectCode());
    entity.setTitle(request.title().trim());
    entity.setDescription(trimToNull(request.description()));
    entity.setMeetingType(trimToNull(request.meetingType()));
    entity.setPlatform(trimToNull(request.platform()));
    entity.setStatus(request.status() == null ? ProjectMeetingStatus.UPCOMING : request.status());
    entity.setOrganizerName(trimToNull(request.organizerName()));
    entity.setOrganizerRole(trimToNull(request.organizerRole()));
    entity.setStartAt(request.startAt());
    entity.setEndAt(request.endAt());
    entity.setTimezone(trimToNull(request.timezone()));
    entity.setMeetingLink(trimToNull(request.meetingLink()));
    entity.setMeetingExternalId(trimToNull(request.meetingExternalId()));
    entity.setReminder(trimToNull(request.reminder()));
    entity.setRepeatRule(trimToNull(request.repeatRule()));
    entity.setParticipantsPayload(writeJson(request.participants()));
    entity.setAgendaPayload(writeJson(request.agenda()));
    entity.setActionsPayload(writeJson(request.actions()));
    entity.setAttachmentsPayload(writeJson(request.attachments()));
    entity.setNotesPayload(writeJson(request.notes()));
  }

  private ProjectMeetingDtos.ProjectMeetingResponse toResponse(ProjectMeetingEntity entity) {
    return new ProjectMeetingDtos.ProjectMeetingResponse(
        entity.getId(),
        entity.getProjectId(),
        entity.getProjectName(),
        entity.getProjectCode(),
        entity.getTitle(),
        entity.getDescription(),
        entity.getMeetingType(),
        entity.getPlatform(),
        entity.getStatus(),
        entity.getOrganizerName(),
        entity.getOrganizerRole(),
        entity.getStartAt(),
        entity.getEndAt(),
        entity.getTimezone(),
        entity.getMeetingLink(),
        entity.getMeetingExternalId(),
        entity.getReminder(),
        entity.getRepeatRule(),
        readJson(entity.getParticipantsPayload(), new TypeReference<List<ProjectMeetingDtos.ParticipantPayload>>() { }),
        readJson(entity.getAgendaPayload(), new TypeReference<List<String>>() { }),
        readJson(entity.getActionsPayload(), new TypeReference<List<ProjectMeetingDtos.ActionItemPayload>>() { }),
        readJson(entity.getAttachmentsPayload(), new TypeReference<List<ProjectMeetingDtos.AttachmentPayload>>() { }),
        readJson(entity.getNotesPayload(), new TypeReference<List<String>>() { }),
        entity.getCreatedAt(),
        entity.getUpdatedAt()
    );
  }

  private ProjectMeetingEntity requireMeeting(String id) {
    return meetingRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found."));
  }

  private ProjectEntity resolveProject(String projectId) {
    String id = trimToNull(projectId);
    if (id == null) {
      return null;
    }

    return projectRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project not found."));
  }

  private void validateRequest(ProjectMeetingDtos.ProjectMeetingRequest request) {
    if (!request.endAt().isAfter(request.startAt())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Meeting end time must be after start time.");
    }
  }

  private String trimToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private String writeJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value == null ? Collections.emptyList() : value);
    } catch (JsonProcessingException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to store meeting data.", exception);
    }
  }

  private <T> T readJson(String payload, TypeReference<T> type) {
    try {
      return objectMapper.readValue(payload == null || payload.isBlank() ? "[]" : payload, type);
    } catch (JsonProcessingException exception) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to read meeting data.", exception);
    }
  }
}
