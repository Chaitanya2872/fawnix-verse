package com.fawnix.verse.leads.service;

import com.fawnix.verse.activities.entity.LeadActivityType;
import com.fawnix.verse.activities.service.LeadActivityService;
import com.fawnix.verse.common.exception.BadRequestException;
import com.fawnix.verse.common.exception.ResourceNotFoundException;
import com.fawnix.verse.leads.dto.LeadDtos;
import com.fawnix.verse.leads.entity.LeadEntity;
import com.fawnix.verse.leads.entity.LeadPriority;
import com.fawnix.verse.leads.entity.LeadSource;
import com.fawnix.verse.leads.entity.LeadStatus;
import com.fawnix.verse.leads.entity.LeadTagEntity;
import com.fawnix.verse.leads.mapper.LeadMapper;
import com.fawnix.verse.leads.repository.LeadRepository;
import com.fawnix.verse.leads.specification.LeadSpecifications;
import com.fawnix.verse.leads.validator.LeadRequestValidator;
import com.fawnix.verse.remarks.service.LeadRemarkService;
import com.fawnix.verse.security.service.AppUserDetails;
import com.fawnix.verse.users.entity.UserEntity;
import com.fawnix.verse.users.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LeadService {

  private static final Map<LeadStatus, Set<LeadStatus>> ALLOWED_STATUS_TRANSITIONS =
      buildAllowedStatusTransitions();

  private final LeadRepository leadRepository;
  private final UserRepository userRepository;
  private final LeadRequestValidator leadRequestValidator;
  private final LeadMapper leadMapper;
  private final LeadRemarkService leadRemarkService;
  private final LeadActivityService leadActivityService;

  public LeadService(
      LeadRepository leadRepository,
      UserRepository userRepository,
      LeadRequestValidator leadRequestValidator,
      LeadMapper leadMapper,
      LeadRemarkService leadRemarkService,
      LeadActivityService leadActivityService
  ) {
    this.leadRepository = leadRepository;
    this.userRepository = userRepository;
    this.leadRequestValidator = leadRequestValidator;
    this.leadMapper = leadMapper;
    this.leadRemarkService = leadRemarkService;
    this.leadActivityService = leadActivityService;
  }

  @Transactional(readOnly = true)
  public LeadDtos.PaginatedLeadResponse getLeads(
      String search,
      String status,
      String source,
      String priority,
      String assignedTo,
      int page,
      int pageSize
  ) {
    LeadStatus statusFilter = parseStatusFilter(status);
    LeadSource sourceFilter = parseSourceFilter(source);
    LeadPriority priorityFilter = parsePriorityFilter(priority);
    Specification<LeadEntity> specification = LeadSpecifications.withFilters(
        search,
        statusFilter,
        sourceFilter,
        priorityFilter,
        assignedTo
    );

    int resolvedPage = Math.max(page, 1);
    int resolvedPageSize = Math.max(pageSize, 1);
    Page<LeadEntity> leadPage = leadRepository.findAll(
        specification,
        PageRequest.of(resolvedPage - 1, resolvedPageSize, Sort.by(Sort.Direction.DESC, "updatedAt"))
    );
    List<LeadEntity> filteredLeads = leadRepository.findAll(
        specification,
        Sort.by(Sort.Direction.DESC, "updatedAt")
    );

    return new LeadDtos.PaginatedLeadResponse(
        leadPage.getContent().stream().map(leadMapper::toResponse).toList(),
        leadPage.getTotalElements(),
        resolvedPage,
        resolvedPageSize,
        leadPage.getTotalPages(),
        leadMapper.toSummary(filteredLeads)
    );
  }

  @Transactional(readOnly = true)
  public LeadDtos.LeadResponse getLead(String id) {
    return leadMapper.toResponse(requireLead(id));
  }

  @Transactional
  public LeadDtos.LeadResponse createLead(LeadDtos.CreateLeadRequest request, AppUserDetails currentUser) {
    Instant now = Instant.now();
    UserEntity actor = requireUser(currentUser.getUserId());

    LeadEntity lead = new LeadEntity();
    lead.setId(UUID.randomUUID().toString());
    lead.setName(request.name().trim());
    lead.setCompany(request.company().trim());
    lead.setEmail(trimToNull(request.email()));
    lead.setPhone(trimToNull(request.phone()));
    lead.setSource(leadRequestValidator.parseSource(request.source()));
    lead.setStatus(leadRequestValidator.parseStatus(request.status()));
    lead.setPriority(leadRequestValidator.parsePriority(request.priority()));
    lead.setAssignedToUser(resolveAssignee(request.assignedToUserId(), request.assignedTo(), true));
    lead.setEstimatedValue(request.estimatedValue() != null ? request.estimatedValue() : BigDecimal.ZERO);
    lead.setNotes("");
    lead.setCreatedAt(now);
    lead.setUpdatedAt(now);
    lead.setCreatedByUser(actor);
    lead.setUpdatedByUser(actor);

    applyStatusTimestamps(lead, lead.getStatus(), now);
    replaceTags(lead, leadRequestValidator.normalizeTags(request.tags()), now);

    if (request.notes() != null && !request.notes().trim().isEmpty()) {
      String content = leadRequestValidator.requireRemarkContent(request.notes());
      leadRemarkService.addRemark(lead, content, actor, now);
      leadActivityService.addActivity(
          lead,
          LeadActivityType.REMARK_ADDED,
          "Added the initial lead remark.",
          actor,
          now
      );
    }

    if (lead.getStatus() != LeadStatus.NEW) {
      leadActivityService.addActivity(
          lead,
          LeadActivityType.STATUS_CHANGE,
          "Lead created in " + prettyStatus(lead.getStatus()) + ".",
          actor,
          now
      );
    }

    if (lead.getStatus() == LeadStatus.CONVERTED) {
      leadActivityService.addActivity(
          lead,
          LeadActivityType.CONVERTED,
          "Lead converted to opportunity.",
          actor,
          lead.getConvertedAt() != null ? lead.getConvertedAt() : now
      );
    }

    return leadMapper.toResponse(leadRepository.save(lead));
  }

  @Transactional
  public LeadDtos.LeadResponse updateLead(String id, LeadDtos.UpdateLeadRequest request, AppUserDetails currentUser) {
    LeadEntity lead = requireLead(id);
    UserEntity actor = requireUser(currentUser.getUserId());
    Instant now = Instant.now();

    if (request.name() != null) {
      lead.setName(request.name().trim());
    }
    if (request.company() != null) {
      lead.setCompany(request.company().trim());
    }
    if (request.email() != null) {
      lead.setEmail(trimToNull(request.email()));
    }
    if (request.phone() != null) {
      lead.setPhone(trimToNull(request.phone()));
    }
    if (request.source() != null) {
      lead.setSource(leadRequestValidator.parseSource(request.source()));
    }
    if (request.priority() != null) {
      lead.setPriority(leadRequestValidator.parsePriority(request.priority()));
    }
    if (request.estimatedValue() != null) {
      lead.setEstimatedValue(request.estimatedValue());
    }
    if (request.tags() != null) {
      replaceTags(lead, leadRequestValidator.normalizeTags(request.tags()), now);
    }
    if (request.assignedTo() != null || request.assignedToUserId() != null) {
      UserEntity nextAssignee = resolveAssignee(request.assignedToUserId(), request.assignedTo(), false);
      if (nextAssignee != null && !sameUser(lead.getAssignedToUser(), nextAssignee)) {
        String previousAssignee = lead.getAssignedToUser() != null ? lead.getAssignedToUser().getFullName() : "Unassigned";
        lead.setAssignedToUser(nextAssignee);
        leadActivityService.addActivity(
            lead,
            LeadActivityType.ASSIGNMENT_CHANGE,
            actor.getFullName() + " reassigned the lead from " + previousAssignee + " to " + nextAssignee.getFullName() + ".",
            actor,
            now
        );
      }
    }
    if (request.status() != null) {
      updateStatusInternal(lead, leadRequestValidator.parseStatus(request.status()), actor, now, request.convertedAt());
    } else if (request.convertedAt() != null) {
      lead.setConvertedAt(request.convertedAt());
    }
    if (request.lastContactedAt() != null) {
      lead.setLastContactedAt(request.lastContactedAt());
    }
    if (request.notes() != null) {
      String nextNotes = request.notes().trim();
      if (!nextNotes.isEmpty() && !nextNotes.equals(lead.getNotes())) {
        leadRemarkService.addRemark(lead, nextNotes, actor, now);
        leadActivityService.addActivity(
            lead,
            LeadActivityType.REMARK_ADDED,
            actor.getFullName() + " added a new remark.",
            actor,
            now
        );
      }
    }

    touchLead(lead, actor, now);
    return leadMapper.toResponse(leadRepository.save(lead));
  }

  @Transactional
  public LeadDtos.LeadResponse updateStatus(
      String id,
      LeadDtos.UpdateLeadStatusRequest request,
      AppUserDetails currentUser
  ) {
    LeadEntity lead = requireLead(id);
    UserEntity actor = requireUser(currentUser.getUserId());
    Instant now = Instant.now();

    updateStatusInternal(lead, leadRequestValidator.parseStatus(request.status()), actor, now, null);
    touchLead(lead, actor, now);
    return leadMapper.toResponse(leadRepository.save(lead));
  }

  @Transactional
  public LeadDtos.LeadResponse assignLead(
      String id,
      LeadDtos.AssignLeadRequest request,
      AppUserDetails currentUser
  ) {
    LeadEntity lead = requireLead(id);
    UserEntity actor = requireUser(currentUser.getUserId());
    UserEntity assignee = resolveAssignee(request.assignedToUserId(), request.assignedTo(), false);
    if (assignee == null) {
      throw new BadRequestException("Assignee is required.");
    }

    Instant now = Instant.now();
    if (!sameUser(lead.getAssignedToUser(), assignee)) {
      String previousAssignee = lead.getAssignedToUser() != null ? lead.getAssignedToUser().getFullName() : "Unassigned";
      lead.setAssignedToUser(assignee);
      leadActivityService.addActivity(
          lead,
          LeadActivityType.ASSIGNMENT_CHANGE,
          actor.getFullName() + " reassigned the lead from " + previousAssignee + " to " + assignee.getFullName() + ".",
          actor,
          now
      );
      if (lead.getStatus() == LeadStatus.QUALIFIED || lead.getStatus() == LeadStatus.UNQUALIFIED) {
        updateStatusInternal(lead, LeadStatus.ASSIGNED_TO_SALESPERSON, actor, now, null);
      }
      touchLead(lead, actor, now);
    }

    return leadMapper.toResponse(leadRepository.save(lead));
  }

  @Transactional
  public LeadDtos.LeadResponse updatePriority(
      String id,
      LeadDtos.UpdateLeadPriorityRequest request,
      AppUserDetails currentUser
  ) {
    LeadEntity lead = requireLead(id);
    UserEntity actor = requireUser(currentUser.getUserId());
    Instant now = Instant.now();
    lead.setPriority(leadRequestValidator.parsePriority(request.priority()));
    touchLead(lead, actor, now);
    return leadMapper.toResponse(leadRepository.save(lead));
  }

  @Transactional
  public LeadDtos.LeadResponse addRemark(
      String id,
      LeadDtos.CreateRemarkRequest request,
      AppUserDetails currentUser
  ) {
    LeadEntity lead = requireLead(id);
    UserEntity actor = requireUser(currentUser.getUserId());
    Instant now = Instant.now();
    String content = leadRequestValidator.requireRemarkContent(request.content());

    leadRemarkService.addRemark(lead, content, actor, now);
    leadActivityService.addActivity(
        lead,
        LeadActivityType.REMARK_ADDED,
        actor.getFullName() + " added a new remark.",
        actor,
        now
    );
    touchLead(lead, actor, now);
    return leadMapper.toResponse(leadRepository.save(lead));
  }

  @Transactional
  public LeadDtos.LeadResponse editRemark(
      String id,
      String remarkId,
      LeadDtos.EditRemarkRequest request,
      AppUserDetails currentUser
  ) {
    LeadEntity lead = requireLead(id);
    UserEntity actor = requireUser(currentUser.getUserId());
    Instant now = Instant.now();
    String content = leadRequestValidator.requireRemarkContent(request.content());

    leadRemarkService.editRemark(lead, remarkId, content, actor, now);
    leadActivityService.addActivity(
        lead,
        LeadActivityType.REMARK_EDITED,
        actor.getFullName() + " edited a remark version.",
        actor,
        now
    );
    touchLead(lead, actor, now);
    return leadMapper.toResponse(leadRepository.save(lead));
  }

  @Transactional
  public void deleteLead(String id) {
    leadRepository.delete(requireLead(id));
  }

  private void updateStatusInternal(
      LeadEntity lead,
      LeadStatus nextStatus,
      UserEntity actor,
      Instant now,
      Instant convertedAt
  ) {
    if (lead.getStatus() == nextStatus) {
      if (convertedAt != null) {
        lead.setConvertedAt(convertedAt);
      }
      return;
    }

    validateStatusTransition(lead.getStatus(), nextStatus);
    lead.setStatus(nextStatus);
    if (convertedAt != null) {
      lead.setConvertedAt(convertedAt);
    }
    applyStatusTimestamps(lead, nextStatus, now);
    leadActivityService.addActivity(
        lead,
        LeadActivityType.STATUS_CHANGE,
        "Lead moved to " + prettyStatus(nextStatus) + ".",
        actor,
        now
    );

    if (nextStatus == LeadStatus.CONVERTED) {
      leadActivityService.addActivity(
          lead,
          LeadActivityType.CONVERTED,
          "Lead converted to opportunity.",
          actor,
          lead.getConvertedAt() != null ? lead.getConvertedAt() : now
      );
    }
  }

  private void applyStatusTimestamps(LeadEntity lead, LeadStatus status, Instant now) {
    if (status == LeadStatus.CONTACTED
        || status == LeadStatus.FOLLOW_UP
        || status == LeadStatus.QUALIFIED
        || status == LeadStatus.UNQUALIFIED
        || status == LeadStatus.ASSIGNED_TO_SALESPERSON
        || status == LeadStatus.PROPOSAL_SENT
        || status == LeadStatus.CONVERTED) {
      if (lead.getLastContactedAt() == null) {
        lead.setLastContactedAt(now);
      }
    }

    if (status == LeadStatus.CONVERTED) {
      if (lead.getConvertedAt() == null) {
        lead.setConvertedAt(now);
      }
    } else {
      lead.setConvertedAt(null);
    }
  }

  private void replaceTags(LeadEntity lead, List<String> tags, Instant now) {
    lead.getTags().clear();
    for (String tag : tags) {
      lead.getTags().add(new LeadTagEntity(UUID.randomUUID().toString(), lead, tag, now));
    }
  }

  private LeadEntity requireLead(String id) {
    return leadRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Lead not found"));
  }

  private UserEntity requireUser(String userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
  }

  private UserEntity resolveAssignee(String assignedToUserId, String assignedTo, boolean allowFallback) {
    if (assignedToUserId != null && !assignedToUserId.isBlank()) {
      return userRepository.findById(assignedToUserId.trim())
          .orElseThrow(() -> new BadRequestException("Assignee not found."));
    }

    if (assignedTo != null && !assignedTo.isBlank()) {
      return userRepository.findByFullNameIgnoreCase(assignedTo.trim())
          .orElseThrow(() -> new BadRequestException("Assignee not found."));
    }

    if (!allowFallback) {
      return null;
    }

    return userRepository.findDistinctByActiveTrueAndRoles_NameInOrderByFullNameAsc(
            List.of("ROLE_SALES_REP", "ROLE_SALES_MANAGER"))
        .stream()
        .findFirst()
        .orElse(null);
  }

  private void touchLead(LeadEntity lead, UserEntity actor, Instant now) {
    lead.setUpdatedByUser(actor);
    lead.setUpdatedAt(now);
  }

  private boolean sameUser(UserEntity left, UserEntity right) {
    return left != null && right != null && left.getId().equals(right.getId());
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private LeadStatus parseStatusFilter(String value) {
    if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value)) {
      return null;
    }
    return leadRequestValidator.parseStatus(value);
  }

  private void validateStatusTransition(LeadStatus currentStatus, LeadStatus nextStatus) {
    Set<LeadStatus> allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS.getOrDefault(
        currentStatus,
        Set.of()
    );
    if (!allowedNextStatuses.contains(nextStatus)) {
      throw new BadRequestException(
          "Invalid stage transition from "
              + prettyStatus(currentStatus)
              + " to "
              + prettyStatus(nextStatus)
              + "."
      );
    }
  }

  private static Map<LeadStatus, Set<LeadStatus>> buildAllowedStatusTransitions() {
    Map<LeadStatus, Set<LeadStatus>> transitions = new EnumMap<>(LeadStatus.class);
    transitions.put(LeadStatus.NEW, EnumSet.of(LeadStatus.CONTACTED, LeadStatus.LOST));
    transitions.put(LeadStatus.CONTACTED, EnumSet.of(LeadStatus.FOLLOW_UP, LeadStatus.LOST));
    transitions.put(
        LeadStatus.FOLLOW_UP,
        EnumSet.of(LeadStatus.QUALIFIED, LeadStatus.UNQUALIFIED, LeadStatus.LOST)
    );
    transitions.put(
        LeadStatus.QUALIFIED,
        EnumSet.of(LeadStatus.ASSIGNED_TO_SALESPERSON, LeadStatus.LOST)
    );
    transitions.put(
        LeadStatus.UNQUALIFIED,
        EnumSet.of(LeadStatus.ASSIGNED_TO_SALESPERSON, LeadStatus.LOST)
    );
    transitions.put(
        LeadStatus.ASSIGNED_TO_SALESPERSON,
        EnumSet.of(LeadStatus.PROPOSAL_SENT, LeadStatus.LOST)
    );
    transitions.put(
        LeadStatus.PROPOSAL_SENT,
        EnumSet.of(LeadStatus.CONVERTED, LeadStatus.LOST)
    );
    transitions.put(LeadStatus.CONVERTED, EnumSet.noneOf(LeadStatus.class));
    transitions.put(LeadStatus.LOST, EnumSet.noneOf(LeadStatus.class));
    return transitions;
  }

  private LeadSource parseSourceFilter(String value) {
    if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value)) {
      return null;
    }
    return leadRequestValidator.parseSource(value);
  }

  private LeadPriority parsePriorityFilter(String value) {
    if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value)) {
      return null;
    }
    return leadRequestValidator.parsePriority(value);
  }

  private String prettyStatus(LeadStatus status) {
    String lower = status.name().toLowerCase(Locale.ROOT).replace('_', ' ');
    return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
  }
}
