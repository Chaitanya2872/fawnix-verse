package com.fawnix.crm.leads.service;

import com.fawnix.crm.activities.entity.LeadActivityType;
import com.fawnix.crm.activities.service.LeadActivityService;
import com.fawnix.crm.common.exception.BadRequestException;
import com.fawnix.crm.common.exception.ResourceNotFoundException;
import com.fawnix.crm.leads.dto.LeadDtos;
import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.leads.entity.LeadScheduleEntity;
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

  public LeadScheduleService(
      LeadRepository leadRepository,
      LeadScheduleRepository scheduleRepository,
      LeadActivityService leadActivityService,
      IdentityUserClient identityUserClient
  ) {
    this.leadRepository = leadRepository;
    this.scheduleRepository = scheduleRepository;
    this.leadActivityService = leadActivityService;
    this.identityUserClient = identityUserClient;
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
    schedule.setLocation(trimToNull(request.location()));
    schedule.setMode(parseMode(request.mode()));
    schedule.setNotes(trimToNull(request.notes()));

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
        LeadActivityType.SCHEDULED,
        buildActivityMessage("Scheduled", saved),
        actor,
        now
    );

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
    if (request.location() != null) {
      schedule.setLocation(trimToNull(request.location()));
      changed = true;
    }
    if (request.mode() != null) {
      schedule.setMode(parseMode(request.mode()));
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

    LeadScheduleEntity saved = scheduleRepository.save(schedule);
    leadActivityService.addActivity(
        schedule.getLead(),
        LeadActivityType.SCHEDULE_UPDATED,
        buildActivityMessage("Updated", saved),
        actor,
        now
    );

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

  private LeadDtos.LeadScheduleResponse toResponse(LeadScheduleEntity schedule) {
    return new LeadDtos.LeadScheduleResponse(
        schedule.getId(),
        schedule.getLead().getId(),
        schedule.getType().name(),
        schedule.getStatus().name(),
        schedule.getScheduledAt(),
        schedule.getLocation(),
        schedule.getMode() != null ? schedule.getMode().name() : null,
        schedule.getNotes(),
        schedule.getAssignedToName() != null ? schedule.getAssignedToName() : "",
        schedule.getAssignedToUserId(),
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
    builder.append(verb).append(" ").append(schedule.getType().name().toLowerCase(Locale.ROOT));
    builder.append(" on ").append(schedule.getScheduledAt());
    if (schedule.getStatus() != null) {
      builder.append(" (status: ").append(schedule.getStatus().name().toLowerCase(Locale.ROOT)).append(")");
    }
    return builder.toString();
  }
}
