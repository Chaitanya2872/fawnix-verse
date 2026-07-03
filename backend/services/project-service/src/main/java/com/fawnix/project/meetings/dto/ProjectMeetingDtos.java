package com.fawnix.project.meetings.dto;

import com.fawnix.project.meetings.domain.ProjectMeetingStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class ProjectMeetingDtos {

  private ProjectMeetingDtos() {
  }

  public record ProjectMeetingRequest(
      @Size(max = 36) String projectId,
      @Size(max = 200) String projectName,
      @Size(max = 40) String projectCode,
      @NotBlank @Size(max = 200) String title,
      @Size(max = 5000) String description,
      @Size(max = 60) String meetingType,
      @Size(max = 80) String platform,
      ProjectMeetingStatus status,
      @Size(max = 160) String organizerName,
      @Size(max = 120) String organizerRole,
      @NotNull Instant startAt,
      @NotNull Instant endAt,
      @Size(max = 80) String timezone,
      String meetingLink,
      @Size(max = 120) String meetingExternalId,
      @Size(max = 80) String reminder,
      @Size(max = 80) String repeatRule,
      List<ParticipantPayload> participants,
      List<String> agenda,
      List<ActionItemPayload> actions,
      List<AttachmentPayload> attachments,
      List<String> notes
  ) {
  }

  public record ProjectMeetingResponse(
      String id,
      String projectId,
      String projectName,
      String projectCode,
      String title,
      String description,
      String meetingType,
      String platform,
      ProjectMeetingStatus status,
      String organizerName,
      String organizerRole,
      Instant startAt,
      Instant endAt,
      String timezone,
      String meetingLink,
      String meetingExternalId,
      String reminder,
      String repeatRule,
      List<ParticipantPayload> participants,
      List<String> agenda,
      List<ActionItemPayload> actions,
      List<AttachmentPayload> attachments,
      List<String> notes,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record ParticipantPayload(
      String name,
      String role,
      String status
  ) {
  }

  public record ActionItemPayload(
      String title,
      String owner,
      String dueDate
  ) {
  }

  public record AttachmentPayload(
      String name,
      String size,
      String tone
  ) {
  }

  public record MeetingStatusRequest(
      @NotNull ProjectMeetingStatus status
  ) {
  }
}
