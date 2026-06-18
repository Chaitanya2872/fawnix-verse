package com.fawnix.crm.leads.service;

import com.fawnix.crm.activities.entity.LeadActivityType;
import com.fawnix.crm.activities.service.LeadActivityService;
import com.fawnix.crm.common.exception.BadRequestException;
import com.fawnix.crm.common.exception.ResourceNotFoundException;
import com.fawnix.crm.leads.dto.LeadDtos;
import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.leads.entity.LeadScheduleEntity;
import com.fawnix.crm.leads.entity.LeadScheduleCallType;
import com.fawnix.crm.leads.entity.LeadScheduleMode;
import com.fawnix.crm.leads.entity.LeadScheduleStatus;
import com.fawnix.crm.leads.entity.LeadScheduleType;
import com.fawnix.crm.leads.repository.LeadRepository;
import com.fawnix.crm.leads.repository.LeadScheduleRepository;
import com.fawnix.crm.security.service.AppUserDetails;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class LeadScheduleService {

  private final LeadRepository leadRepository;
  private final LeadScheduleRepository scheduleRepository;
  private final LeadActivityService leadActivityService;
  private final IdentityUserClient identityUserClient;
  private final LeadNotificationStreamService notificationStreamService;

  public LeadScheduleService(
      LeadRepository leadRepository,
      LeadScheduleRepository scheduleRepository,
      LeadActivityService leadActivityService,
      IdentityUserClient identityUserClient,
      LeadNotificationStreamService notificationStreamService
  ) {
    this.leadRepository = leadRepository;
    this.scheduleRepository = scheduleRepository;
    this.leadActivityService = leadActivityService;
    this.identityUserClient = identityUserClient;
    this.notificationStreamService = notificationStreamService;
  }

  @Transactional(readOnly = true)
  public List<LeadDtos.LeadScheduleResponse> getSchedules(String leadId) {
    requireLead(leadId);
    return scheduleRepository.findByLeadIdOrderByScheduledAtDesc(leadId)
        .stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public LeadDtos.LeadScheduleResponse createSchedule(
      String leadId,
      LeadDtos.CreateLeadScheduleRequest request,
      AppUserDetails actor
  ) {
    LeadEntity lead = requireLead(leadId);
    LeadScheduleType type = parseType(request.type());
    Instant scheduledAt = request.scheduledAt();
    if (scheduledAt == null) {
      throw new BadRequestException("Scheduled time is required.");
    }

    LeadScheduleEntity schedule = new LeadScheduleEntity();
    schedule.setId(UUID.randomUUID().toString());
    schedule.setLead(lead);
    schedule.setType(type);
    schedule.setStatus(LeadScheduleStatus.SCHEDULED);
    schedule.setScheduledAt(scheduledAt);
    schedule.setTitle(resolveTitle(type, request.title()));
    schedule.setDurationMinutes(normalizeDuration(request.durationMinutes()));
    schedule.setCallType(parseCallType(request.callType()));
    schedule.setLocation(trimToNull(request.location()));
    schedule.setMode(parseMode(request.mode()));
    schedule.setMeetingLink(trimToNull(request.meetingLink()));
    schedule.setNotes(trimToNull(request.notes()));
    schedule.setCompletedAt(null);
    schedule.setCancelledAt(null);

    applyAssignee(schedule, lead, request.assignedToUserId(), request.assignedTo());

    Instant now = Instant.now();
    schedule.setCreatedAt(now);
    schedule.setUpdatedAt(now);
    schedule.setCreatedByUserId(actor.getUserId());
    schedule.setCreatedByName(actor.getFullName());
    schedule.setUpdatedByUserId(actor.getUserId());
    schedule.setUpdatedByName(actor.getFullName());

    LeadScheduleEntity saved = scheduleRepository.save(schedule);
    leadActivityService.addActivity(
        lead,
        toCreatedActivityType(saved.getType()),
        buildActivityMessage("Scheduled", saved),
        actor,
        now
    );
    notificationStreamService.sendReminderAssigned();

    return toResponse(saved);
  }

  @Transactional
  public LeadDtos.LeadScheduleResponse updateSchedule(
      String leadId,
      String scheduleId,
      LeadDtos.UpdateLeadScheduleRequest request,
      AppUserDetails actor
  ) {
    LeadScheduleEntity schedule = requireSchedule(leadId, scheduleId);
    boolean changed = false;

    if (StringUtils.hasText(request.type())) {
      schedule.setType(parseType(request.type()));
      changed = true;
    }
    if (StringUtils.hasText(request.status())) {
      schedule.setStatus(parseStatus(request.status()));
      changed = true;
    }
    if (request.scheduledAt() != null) {
      schedule.setScheduledAt(request.scheduledAt());
      changed = true;
    }
    if (request.title() != null) {
      schedule.setTitle(resolveTitle(schedule.getType(), request.title()));
      changed = true;
    }
    if (request.durationMinutes() != null) {
      schedule.setDurationMinutes(normalizeDuration(request.durationMinutes()));
      changed = true;
    }
    if (request.callType() != null) {
      schedule.setCallType(parseCallType(request.callType()));
      changed = true;
    }
    if (request.location() != null) {
      schedule.setLocation(trimToNull(request.location()));
      changed = true;
    }
    if (request.mode() != null) {
      schedule.setMode(parseMode(request.mode()));
      changed = true;
    }
    if (request.meetingLink() != null) {
      schedule.setMeetingLink(trimToNull(request.meetingLink()));
      changed = true;
    }
    if (request.notes() != null) {
      schedule.setNotes(trimToNull(request.notes()));
      changed = true;
    }
    if (request.assignedTo() != null || request.assignedToUserId() != null) {
      applyAssignee(schedule, schedule.getLead(), request.assignedToUserId(), request.assignedTo());
      changed = true;
    }

    if (!changed) {
      return toResponse(schedule);
    }

    Instant now = Instant.now();
    schedule.setUpdatedAt(now);
    schedule.setUpdatedByUserId(actor.getUserId());
    schedule.setUpdatedByName(actor.getFullName());
    syncTerminalTimestamps(schedule, now);

    LeadScheduleEntity saved = scheduleRepository.save(schedule);
    LeadActivityType activityType = resolveUpdateActivityType(saved);
    leadActivityService.addActivity(
        schedule.getLead(),
        activityType,
        buildActivityMessage("Updated", saved),
        actor,
        now
    );
    if (activityType == LeadActivityType.REMINDER_COMPLETED) {
      notificationStreamService.sendReminderCompleted();
    } else if (activityType == LeadActivityType.REMINDER_CANCELLED) {
      notificationStreamService.sendReminderCancelled();
    } else {
      notificationStreamService.sendReminderRescheduled();
    }

    return toResponse(saved);
  }

  private LeadEntity requireLead(String id) {
    return leadRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Lead not found"));
  }

  private LeadScheduleEntity requireSchedule(String leadId, String scheduleId) {
    LeadScheduleEntity schedule = scheduleRepository.findById(scheduleId)
        .orElseThrow(() -> new ResourceNotFoundException("Schedule not found"));
    if (!schedule.getLead().getId().equals(leadId)) {
      throw new ResourceNotFoundException("Schedule not found");
    }
    return schedule;
  }

  private void applyAssignee(
      LeadScheduleEntity schedule,
      LeadEntity lead,
      String assignedToUserId,
      String assignedTo
  ) {
    IdentityUserClient.IdentityUser assignee = null;
    if (StringUtils.hasText(assignedToUserId)) {
      assignee = identityUserClient.getAssignableUserById(assignedToUserId.trim());
    } else if (StringUtils.hasText(assignedTo)) {
      assignee = identityUserClient.getAssignableUserByName(assignedTo.trim());
    } else if (StringUtils.hasText(lead.getAssignedToUserId())) {
      assignee = identityUserClient.getAssignableUserById(lead.getAssignedToUserId());
    }

    if (assignee != null) {
      schedule.setAssignedToUserId(assignee.id());
      schedule.setAssignedToName(assignee.name());
    } else {
      schedule.setAssignedToUserId(null);
      schedule.setAssignedToName(null);
    }
  }

  private LeadScheduleType parseType(String value) {
    try {
      return LeadScheduleType.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (Exception ex) {
      throw new BadRequestException("Invalid schedule type.");
    }
  }

  private LeadScheduleStatus parseStatus(String value) {
    try {
      return LeadScheduleStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (Exception ex) {
      throw new BadRequestException("Invalid schedule status.");
    }
  }

  private LeadScheduleMode parseMode(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    try {
      return LeadScheduleMode.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (Exception ex) {
      throw new BadRequestException("Invalid schedule mode.");
    }
  }

  private LeadScheduleCallType parseCallType(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    try {
      return LeadScheduleCallType.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (Exception ex) {
      throw new BadRequestException("Invalid call type.");
    }
  }

  private LeadDtos.LeadScheduleResponse toResponse(LeadScheduleEntity schedule) {
    String status = schedule.getStatus().name();
    if (schedule.getStatus() == LeadScheduleStatus.SCHEDULED && schedule.getScheduledAt().isBefore(Instant.now())) {
      status = LeadScheduleStatus.MISSED.name();
    }
    return new LeadDtos.LeadScheduleResponse(
        schedule.getId(),
        schedule.getLead().getId(),
        schedule.getType().name(),
        status,
        schedule.getScheduledAt(),
        schedule.getTitle(),
        schedule.getDurationMinutes(),
        schedule.getCallType() != null ? schedule.getCallType().name() : null,
        schedule.getLocation(),
        schedule.getMode() != null ? schedule.getMode().name() : null,
        schedule.getMeetingLink(),
        schedule.getNotes(),
        schedule.getAssignedToName() != null ? schedule.getAssignedToName() : "",
        schedule.getAssignedToUserId(),
        schedule.getCompletedAt(),
        schedule.getCancelledAt(),
        schedule.getCreatedAt(),
        schedule.getUpdatedAt()
    );
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private String buildActivityMessage(String verb, LeadScheduleEntity schedule) {
    StringBuilder builder = new StringBuilder();
    builder.append(schedule.getTitle() != null ? schedule.getTitle() : readableType(schedule.getType()));
    builder.append(" ").append(verb.toLowerCase(Locale.ROOT));
    builder.append(" for ").append(schedule.getScheduledAt());
    if (schedule.getAssignedToName() != null && !schedule.getAssignedToName().isBlank()) {
      builder.append(" with ").append(schedule.getAssignedToName());
    }
    return builder.toString();
  }

  private String resolveTitle(LeadScheduleType type, String requestedTitle) {
    String trimmed = trimToNull(requestedTitle);
    return trimmed != null ? trimmed : readableType(type);
  }

  private Integer normalizeDuration(Integer value) {
    if (value == null) {
      return null;
    }
    if (value < 0) {
      throw new BadRequestException("Duration must be zero or greater.");
    }
    return value;
  }

  private void syncTerminalTimestamps(LeadScheduleEntity schedule, Instant now) {
    if (schedule.getStatus() == LeadScheduleStatus.COMPLETED) {
      schedule.setCompletedAt(now);
    } else if (schedule.getStatus() == LeadScheduleStatus.CANCELLED) {
      schedule.setCancelledAt(now);
    } else {
      schedule.setCompletedAt(null);
      schedule.setCancelledAt(null);
    }
  }

  private LeadActivityType toCreatedActivityType(LeadScheduleType type) {
    return switch (type) {
      case DEMO_VISIT, DEMO -> LeadActivityType.DEMO_VISIT;
      case FOLLOW_UP_CALL -> LeadActivityType.FOLLOW_UP_CALL;
      case SITE_VISIT, VISIT -> LeadActivityType.SITE_VISIT;
    };
  }

  private LeadActivityType resolveUpdateActivityType(LeadScheduleEntity schedule) {
    return switch (schedule.getStatus()) {
      case COMPLETED -> LeadActivityType.REMINDER_COMPLETED;
      case CANCELLED -> LeadActivityType.REMINDER_CANCELLED;
      case MISSED, SCHEDULED -> LeadActivityType.REMINDER_RESCHEDULED;
    };
  }

  private String readableType(LeadScheduleType type) {
    return switch (type) {
      case DEMO_VISIT, DEMO -> "Demo Visit";
      case FOLLOW_UP_CALL -> "Follow-up Call";
      case SITE_VISIT, VISIT -> "Site Visit";
    };
  }
}
