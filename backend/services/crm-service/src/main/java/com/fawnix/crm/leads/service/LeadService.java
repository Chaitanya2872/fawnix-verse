package com.fawnix.crm.leads.service;

import com.fawnix.crm.activities.entity.LeadActivityType;
import com.fawnix.crm.activities.service.LeadActivityService;
import com.fawnix.crm.common.exception.BadRequestException;
import com.fawnix.crm.common.exception.ResourceNotFoundException;
import com.fawnix.crm.contact.service.LeadContactRecordingService;
import com.fawnix.crm.integrations.whatsapp.WhatsappQuestionnaireService;
import com.fawnix.crm.leads.dto.LeadDtos;
import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.leads.entity.LeadPriority;
import com.fawnix.crm.leads.entity.LeadSource;
import com.fawnix.crm.leads.entity.LeadStatus;
import com.fawnix.crm.leads.entity.LeadTagEntity;
import com.fawnix.crm.leads.mapper.LeadMapper;
import com.fawnix.crm.leads.repository.LeadRepository;
import com.fawnix.crm.leads.service.IdentityUserClient.IdentityUser;
import com.fawnix.crm.leads.specification.LeadSpecifications;
import com.fawnix.crm.leads.validator.LeadRequestValidator;
import com.fawnix.crm.remarks.service.LeadRemarkService;
import com.fawnix.crm.security.service.AppUserDetails;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LeadService {
  private static final Logger LOGGER = LoggerFactory.getLogger(LeadService.class);

  private static final Map<LeadStatus, Set<LeadStatus>> ALLOWED_STATUS_TRANSITIONS =
      buildAllowedStatusTransitions();

  private final LeadRepository leadRepository;
  private final LeadRequestValidator leadRequestValidator;
  private final LeadMapper leadMapper;
  private final LeadRemarkService leadRemarkService;
  private final LeadActivityService leadActivityService;
  private final IdentityUserClient identityUserClient;
  private final LeadContactRecordingService leadContactRecordingService;
  private final LeadStatusHistoryService leadStatusHistoryService;
  private final WhatsappQuestionnaireService whatsappQuestionnaireService;
  private final LeadNotificationStreamService notificationStreamService;

  public LeadService(
      LeadRepository leadRepository,
      LeadRequestValidator leadRequestValidator,
      LeadMapper leadMapper,
      LeadRemarkService leadRemarkService,
      LeadActivityService leadActivityService,
      IdentityUserClient identityUserClient,
      LeadContactRecordingService leadContactRecordingService,
      LeadStatusHistoryService leadStatusHistoryService,
      WhatsappQuestionnaireService whatsappQuestionnaireService,
      LeadNotificationStreamService notificationStreamService
  ) {
    this.leadRepository = leadRepository;
    this.leadRequestValidator = leadRequestValidator;
    this.leadMapper = leadMapper;
    this.leadRemarkService = leadRemarkService;
    this.leadActivityService = leadActivityService;
    this.identityUserClient = identityUserClient;
    this.leadContactRecordingService = leadContactRecordingService;
    this.leadStatusHistoryService = leadStatusHistoryService;
    this.whatsappQuestionnaireService = whatsappQuestionnaireService;
    this.notificationStreamService = notificationStreamService;
  }

  @Transactional(readOnly = true)
  public LeadDtos.PaginatedLeadResponse getLeads(
      String search,
      String status,
      String source,
      String priority,
      String assignedTo,
      String questionnaireStatus,
      int page,
      int pageSize,
      AppUserDetails actor
  ) {
    LeadStatus statusFilter = parseStatusFilter(status);
    LeadSource sourceFilter = parseSourceFilter(source);
    LeadPriority priorityFilter = parsePriorityFilter(priority);
    String effectiveAssignedTo = assignedTo;
    if (isSalesRepOnly(actor)) {
      effectiveAssignedTo = actor.getUserId();
    }
    Specification<LeadEntity> specification = LeadSpecifications.withFilters(
        search,
        statusFilter,
        sourceFilter,
        priorityFilter,
        effectiveAssignedTo,
        questionnaireStatus
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
    LeadEntity lead = requireLead(id);
    return toLeadResponse(lead, null);
  }

  @Transactional(readOnly = true)
  public LeadDtos.LeadNotificationsResponse getNotifications(AppUserDetails actor) {
    String assignedFilter = null;
    if (isSalesRepOnly(actor)) {
      assignedFilter = actor.getUserId();
    }
    String normalized = assignedFilter != null && !assignedFilter.isBlank()
        ? assignedFilter.trim().toLowerCase(Locale.ROOT)
        : null;

    long newLeadCount = leadRepository.countByStatusAndAssignee(LeadStatus.NEW, normalized);
    long followUpDueCount = leadRepository.countFollowUpsDue(Instant.now(), normalized);
    return new LeadDtos.LeadNotificationsResponse(newLeadCount, followUpDueCount, Instant.now());
  }

  @Transactional
  public LeadDtos.LeadResponse createLead(LeadDtos.CreateLeadRequest request, AppUserDetails currentUser) {
    Instant now = Instant.now();
    LeadEntity lead = new LeadEntity();
    lead.setId(UUID.randomUUID().toString());
    lead.setName(request.name().trim());
    lead.setCompany(request.company().trim());
    lead.setEmail(trimToNull(request.email()));
    lead.setPhone(trimToNull(request.phone()));
    lead.setExternalLeadId(trimToNull(request.externalLeadId()));
    lead.setSourceMonth(trimToNull(request.sourceMonth()));
    lead.setSourceDate(trimToNull(request.sourceDate()));
    lead.setAlternativePhone(trimToNull(request.alternativePhone()));
    lead.setProjectStage(trimToNull(request.projectStage()));
    lead.setExpectedTimeline(trimToNull(request.expectedTimeline()));
    lead.setPropertyType(trimToNull(request.propertyType()));
    lead.setSqft(trimToNull(request.sqft()));
    lead.setCommunity(trimToNull(request.community()));
    lead.setProjectLocation(trimToNull(request.projectLocation()));
    lead.setProjectState(trimToNull(request.projectState()));
    lead.setPresalesResponse(trimToNull(request.presalesResponse()));
    lead.setDemoVisit(trimToNull(request.demoVisit()));
    lead.setPresalesRemarks(trimToNull(request.presalesRemarks()));
    lead.setAdSetName(trimToNull(request.adSetName()));
    lead.setCampaignName(trimToNull(request.campaignName()));
    lead.setMetaLeadId(trimToNull(request.metaLeadId()));
    lead.setMetaFormId(trimToNull(request.metaFormId()));
    lead.setMetaAdId(trimToNull(request.metaAdId()));
    lead.setSourceCreatedAt(request.sourceCreatedAt());
    lead.setSource(leadRequestValidator.parseSource(request.source()));
    lead.setStatus(leadRequestValidator.parseStatus(request.status()));
    lead.setPriority(leadRequestValidator.parsePriority(request.priority()));
    applyAssignee(lead, resolveAssignee(request.assignedToUserId(), request.assignedTo(), false));
    lead.setEstimatedValue(request.estimatedValue() != null ? request.estimatedValue() : BigDecimal.ZERO);
    lead.setNotes("");
    lead.setCreatedAt(now);
    lead.setUpdatedAt(now);
    lead.setFollowUpAt(request.followUpAt());
    lead.setCreatedByUserId(currentUser.getUserId());
    lead.setCreatedByName(currentUser.getFullName());
    lead.setUpdatedByUserId(currentUser.getUserId());
    lead.setUpdatedByName(currentUser.getFullName());

    applyStatusTimestamps(lead, lead.getStatus(), now);
    replaceTags(lead, leadRequestValidator.normalizeTags(request.tags()), now);

    if (request.notes() != null && !request.notes().trim().isEmpty()) {
      String content = leadRequestValidator.requireRemarkContent(request.notes());
      leadRemarkService.addRemark(lead, content, currentUser, now);
      leadActivityService.addActivity(
          lead,
          LeadActivityType.REMARK_ADDED,
          "Added the initial lead remark.",
          currentUser,
          now
      );
    }

    if (lead.getStatus() != LeadStatus.NEW) {
      leadActivityService.addActivity(
          lead,
          LeadActivityType.STATUS_CHANGE,
          "Lead created in " + prettyStatus(lead.getStatus()) + ".",
          currentUser,
          now
      );
    }

    if (lead.getStatus() == LeadStatus.CONVERTED) {
      leadActivityService.addActivity(
          lead,
          LeadActivityType.CONVERTED,
          "Lead converted to opportunity.",
          currentUser,
          lead.getConvertedAt() != null ? lead.getConvertedAt() : now
      );
    }

    LeadEntity saved = leadRepository.save(lead);
    leadStatusHistoryService.recordInitial(saved, saved.getStatus(), currentUser, now);
    whatsappQuestionnaireService.sendIntro(saved);
    notificationStreamService.sendLeadCreated();
    return toLeadResponse(saved, null);
  }

  @Transactional
  public LeadDtos.LeadResponse updateLead(String id, LeadDtos.UpdateLeadRequest request, AppUserDetails currentUser) {
    LeadEntity lead = requireLead(id);
    Instant now = Instant.now();
    LeadDtos.WhatsappDispatchLog whatsappDispatchLog = null;

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
    if (request.externalLeadId() != null) {
      lead.setExternalLeadId(trimToNull(request.externalLeadId()));
    }
    if (request.sourceMonth() != null) {
      lead.setSourceMonth(trimToNull(request.sourceMonth()));
    }
    if (request.sourceDate() != null) {
      lead.setSourceDate(trimToNull(request.sourceDate()));
    }
    if (request.alternativePhone() != null) {
      lead.setAlternativePhone(trimToNull(request.alternativePhone()));
    }
    if (request.projectStage() != null) {
      lead.setProjectStage(trimToNull(request.projectStage()));
    }
    if (request.expectedTimeline() != null) {
      lead.setExpectedTimeline(trimToNull(request.expectedTimeline()));
    }
    if (request.propertyType() != null) {
      lead.setPropertyType(trimToNull(request.propertyType()));
    }
    if (request.sqft() != null) {
      lead.setSqft(trimToNull(request.sqft()));
    }
    if (request.community() != null) {
      lead.setCommunity(trimToNull(request.community()));
    }
    if (request.projectLocation() != null) {
      lead.setProjectLocation(trimToNull(request.projectLocation()));
    }
    if (request.projectState() != null) {
      lead.setProjectState(trimToNull(request.projectState()));
    }
    if (request.presalesResponse() != null) {
      lead.setPresalesResponse(trimToNull(request.presalesResponse()));
    }
    if (request.demoVisit() != null) {
      lead.setDemoVisit(trimToNull(request.demoVisit()));
    }
    if (request.presalesRemarks() != null) {
      lead.setPresalesRemarks(trimToNull(request.presalesRemarks()));
    }
    if (request.adSetName() != null) {
      lead.setAdSetName(trimToNull(request.adSetName()));
    }
    if (request.campaignName() != null) {
      lead.setCampaignName(trimToNull(request.campaignName()));
    }
    if (request.metaLeadId() != null) {
      lead.setMetaLeadId(trimToNull(request.metaLeadId()));
    }
    if (request.metaFormId() != null) {
      lead.setMetaFormId(trimToNull(request.metaFormId()));
    }
    if (request.metaAdId() != null) {
      lead.setMetaAdId(trimToNull(request.metaAdId()));
    }
    if (request.sourceCreatedAt() != null) {
      lead.setSourceCreatedAt(request.sourceCreatedAt());
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
      IdentityUser nextAssignee = resolveAssignee(request.assignedToUserId(), request.assignedTo(), false);
      if (nextAssignee != null && !sameUser(lead.getAssignedToUserId(), nextAssignee.id())) {
        validateLeadReadyForAssignment(lead);
        String previousAssignee = lead.getAssignedToName() != null ? lead.getAssignedToName() : "Unassigned";
        applyAssignee(lead, nextAssignee);
        leadActivityService.addActivity(
            lead,
            LeadActivityType.ASSIGNMENT_CHANGE,
            currentUser.getFullName() + " reassigned the lead from " + previousAssignee + " to " + nextAssignee.name() + ".",
            currentUser,
            now
        );
        WhatsappQuestionnaireService.DispatchResult dispatchResult =
            whatsappQuestionnaireService.sendAssignmentNotification(
                lead,
                nextAssignee.name(),
                nextAssignee.phoneNumber()
            );
        whatsappDispatchLog = new LeadDtos.WhatsappDispatchLog(dispatchResult.sent(), dispatchResult.reason());
        LOGGER.info(
            "WhatsApp assignment notification (updateLead) lead={}, assignee={}, status={}, reason={}",
            lead.getId(),
            nextAssignee.name(),
            dispatchResult.sent() ? "sent" : "skipped",
            dispatchResult.reason()
        );
      }
    }
    if (request.status() != null) {
      updateStatusInternal(
          lead,
          leadRequestValidator.parseStatus(request.status()),
          currentUser,
          now,
          request.convertedAt(),
          request.followUpAt(),
          request.statusRemark()
      );
    } else if (request.convertedAt() != null) {
      lead.setConvertedAt(request.convertedAt());
    }
    if (request.lastContactedAt() != null) {
      lead.setLastContactedAt(request.lastContactedAt());
    }
    if (request.followUpAt() != null) {
      lead.setFollowUpAt(request.followUpAt());
      lead.setFollowUpReminderSentAt(null);
    }
    if (request.notes() != null) {
      String nextNotes = request.notes().trim();
      if (!nextNotes.isEmpty() && !nextNotes.equals(lead.getNotes())) {
        leadRemarkService.addRemark(lead, nextNotes, currentUser, now);
        leadActivityService.addActivity(
            lead,
            LeadActivityType.REMARK_ADDED,
            currentUser.getFullName() + " added a new remark.",
            currentUser,
            now
        );
      }
    }

    touchLead(lead, currentUser, now);
    return toLeadResponse(leadRepository.save(lead), whatsappDispatchLog);
  }

  @Transactional
  public LeadDtos.LeadResponse updateStatus(
      String id,
      LeadDtos.UpdateLeadStatusRequest request,
      AppUserDetails currentUser
  ) {
    LeadEntity lead = requireLead(id);
    Instant now = Instant.now();

    updateStatusInternal(
        lead,
        leadRequestValidator.parseStatus(request.status()),
        currentUser,
        now,
        null,
        request.followUpAt(),
        request.remark()
    );
    touchLead(lead, currentUser, now);
    return toLeadResponse(leadRepository.save(lead), null);
  }

  @Transactional
  public LeadDtos.LeadResponse captureContactRecording(
      String id,
      MultipartFile audio,
      Instant contactedAt,
      AppUserDetails currentUser
  ) {
    LeadEntity lead = requireLead(id);
    Instant now = contactedAt != null ? contactedAt : Instant.now();

    LeadContactRecordingService.ProcessedContactRecording processed = leadContactRecordingService.capture(
        lead,
        audio,
        currentUser,
        now
    );

    if (lead.getStatus() == LeadStatus.NEW || lead.getStatus() == LeadStatus.CONTACTED) {
      updateStatusInternal(lead, LeadStatus.CONTACTED, currentUser, now, null, null, null);
    }
    lead.setLastContactedAt(now);
    leadRemarkService.addRemark(lead, processed.remarkContent(), currentUser, now);
    leadActivityService.addActivity(
        lead,
        LeadActivityType.CALL,
        currentUser.getFullName() + " uploaded a call recording and saved the generated contact summary.",
        currentUser,
        now
    );
    touchLead(lead, currentUser, now);
    return toLeadResponse(leadRepository.save(lead), null);
  }

  @Transactional
  public LeadDtos.LeadResponse assignLead(
      String id,
      LeadDtos.AssignLeadRequest request,
      AppUserDetails currentUser
  ) {
    LeadEntity lead = requireLead(id);
    IdentityUser assignee = resolveAssignee(request.assignedToUserId(), request.assignedTo(), false);
    if (assignee == null) {
      throw new BadRequestException("Assignee is required.");
    }
    validateLeadReadyForAssignment(lead);

    Instant now = Instant.now();
    LeadDtos.WhatsappDispatchLog whatsappDispatchLog = null;
    if (!sameUser(lead.getAssignedToUserId(), assignee.id())) {
      String previousAssignee = lead.getAssignedToName() != null ? lead.getAssignedToName() : "Unassigned";
      applyAssignee(lead, assignee);
      leadActivityService.addActivity(
          lead,
          LeadActivityType.ASSIGNMENT_CHANGE,
          currentUser.getFullName() + " reassigned the lead from " + previousAssignee + " to " + assignee.name() + ".",
          currentUser,
          now
      );
      WhatsappQuestionnaireService.DispatchResult dispatchResult =
          whatsappQuestionnaireService.sendAssignmentNotification(
              lead,
              assignee.name(),
              assignee.phoneNumber()
          );
      whatsappDispatchLog = new LeadDtos.WhatsappDispatchLog(dispatchResult.sent(), dispatchResult.reason());
      LOGGER.info(
          "WhatsApp assignment notification (assignLead) lead={}, assignee={}, status={}, reason={}",
          lead.getId(),
          assignee.name(),
          dispatchResult.sent() ? "sent" : "skipped",
          dispatchResult.reason()
      );
      if (lead.getStatus() == LeadStatus.QUALIFIED || lead.getStatus() == LeadStatus.UNQUALIFIED) {
        updateStatusInternal(lead, LeadStatus.ASSIGNED_TO_SALESPERSON, currentUser, now, null, null, null);
      }
      touchLead(lead, currentUser, now);
    }

    return toLeadResponse(leadRepository.save(lead), whatsappDispatchLog);
  }

  @Transactional
  public LeadDtos.LeadResponse updatePriority(
      String id,
      LeadDtos.UpdateLeadPriorityRequest request,
      AppUserDetails currentUser
  ) {
    LeadEntity lead = requireLead(id);
    Instant now = Instant.now();
    lead.setPriority(leadRequestValidator.parsePriority(request.priority()));
    touchLead(lead, currentUser, now);
    return toLeadResponse(leadRepository.save(lead), null);
  }

  @Transactional
  public LeadDtos.LeadResponse addRemark(
      String id,
      LeadDtos.CreateRemarkRequest request,
      AppUserDetails currentUser
  ) {
    LeadEntity lead = requireLead(id);
    Instant now = Instant.now();
    String content = leadRequestValidator.requireRemarkContent(request.content());

    leadRemarkService.addRemark(lead, content, currentUser, now);
    leadActivityService.addActivity(
        lead,
        LeadActivityType.REMARK_ADDED,
        currentUser.getFullName() + " added a new remark.",
        currentUser,
        now
    );
    touchLead(lead, currentUser, now);
    return toLeadResponse(leadRepository.save(lead), null);
  }

  @Transactional
  public LeadDtos.LeadResponse editRemark(
      String id,
      String remarkId,
      LeadDtos.EditRemarkRequest request,
      AppUserDetails currentUser
  ) {
    LeadEntity lead = requireLead(id);
    Instant now = Instant.now();
    String content = leadRequestValidator.requireRemarkContent(request.content());

    leadRemarkService.editRemark(lead, remarkId, content, currentUser, now);
    leadActivityService.addActivity(
        lead,
        LeadActivityType.REMARK_EDITED,
        currentUser.getFullName() + " edited a remark version.",
        currentUser,
        now
    );
    touchLead(lead, currentUser, now);
    return toLeadResponse(leadRepository.save(lead), null);
  }

  @Transactional
  public void deleteLead(String id) {
    LeadEntity lead = requireLead(id);
    leadContactRecordingService.deleteStoredRecordings(lead);
    leadStatusHistoryService.deleteForLead(lead.getId());
    leadRepository.delete(lead);
  }

  private void updateStatusInternal(
      LeadEntity lead,
      LeadStatus nextStatus,
      AppUserDetails actor,
      Instant now,
      Instant convertedAt,
      Instant followUpAt,
      String remark
  ) {
    LeadStatus currentStatus = lead.getStatus();
    if (nextStatus == LeadStatus.FOLLOW_UP) {
      Instant effectiveFollowUpAt = followUpAt != null ? followUpAt : lead.getFollowUpAt();
      if (effectiveFollowUpAt == null) {
        throw new BadRequestException("Follow-up date is required for follow-up stage.");
      }
      if (followUpAt != null) {
        lead.setFollowUpAt(followUpAt);
        lead.setFollowUpReminderSentAt(null);
      }
    }

    if (lead.getStatus() == nextStatus) {
      if (convertedAt != null && nextStatus == LeadStatus.CONVERTED) {
        lead.setConvertedAt(convertedAt);
      }
      if (nextStatus == LeadStatus.FOLLOW_UP) {
        leadActivityService.addActivity(
            lead,
            LeadActivityType.STATUS_CHANGE,
            followUpAt != null ? "Lead follow-up was rescheduled." : "Lead follow-up was updated.",
            actor,
            now
        );
      } else {
        leadActivityService.addActivity(
            lead,
            LeadActivityType.STATUS_CHANGE,
            "Lead stage entry recorded for " + prettyStatus(nextStatus) + ".",
            actor,
            now
        );
      }
      leadStatusHistoryService.recordTransition(
          lead,
          currentStatus,
          nextStatus,
          actor,
          now,
          trimToNull(remark)
      );
      return;
    }

    validateStatusTransition(currentStatus, nextStatus);
    lead.setStatus(nextStatus);
    if (convertedAt != null) {
      lead.setConvertedAt(convertedAt);
    }
    applyStatusTimestamps(lead, nextStatus, now);
    leadStatusHistoryService.recordTransition(
        lead,
        currentStatus,
        nextStatus,
        actor,
        now,
        trimToNull(remark)
    );
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
    Map<String, LeadTagEntity> existingTagsByValue = new LinkedHashMap<>();
    for (LeadTagEntity tagEntity : lead.getTags()) {
      existingTagsByValue.put(tagEntity.getTagValue(), tagEntity);
    }

    Set<String> requestedTags = Set.copyOf(tags);
    lead.getTags().removeIf(tagEntity -> !requestedTags.contains(tagEntity.getTagValue()));

    for (String tag : tags) {
      if (!existingTagsByValue.containsKey(tag)) {
        lead.getTags().add(new LeadTagEntity(UUID.randomUUID().toString(), lead, tag, now));
      }
    }
  }

  private LeadEntity requireLead(String id) {
    return leadRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Lead not found"));
  }

  private IdentityUser resolveAssignee(String assignedToUserId, String assignedTo, boolean allowFallback) {
    if (assignedToUserId != null && !assignedToUserId.isBlank()) {
      return identityUserClient.getAssignableUserById(assignedToUserId.trim());
    }

    if (assignedTo != null && !assignedTo.isBlank()) {
      return identityUserClient.getAssignableUserByName(assignedTo.trim());
    }

    if (!allowFallback) {
      return null;
    }

    return identityUserClient.getDefaultAssignee();
  }

  private void applyAssignee(LeadEntity lead, IdentityUser assignee) {
    if (assignee == null) {
      lead.setAssignedToUserId(null);
      lead.setAssignedToName(null);
      return;
    }

    lead.setAssignedToUserId(assignee.id());
    lead.setAssignedToName(assignee.name());
  }

  private void touchLead(LeadEntity lead, AppUserDetails actor, Instant now) {
    lead.setUpdatedByUserId(actor.getUserId());
    lead.setUpdatedByName(actor.getFullName());
    lead.setUpdatedAt(now);
  }

  private boolean isSalesRepOnly(AppUserDetails actor) {
    if (actor == null) {
      return false;
    }
    boolean adminLike = actor.getRoleNames().stream()
        .anyMatch(role -> role.equals("ROLE_ADMIN")
            || role.equals("ROLE_REPORTING_MANAGER")
            || role.equals("ROLE_SALES_MANAGER"));
    return !adminLike && actor.getRoleNames().contains("ROLE_SALES_REP");
  }

  private boolean sameUser(String left, String right) {
    return left != null && right != null && left.equals(right);
  }

  private void validateLeadReadyForAssignment(LeadEntity lead) {
    if (!hasUserFollowUpRemark(lead)) {
      throw new BadRequestException(
          "Add a proper follow-up remark before assigning this lead. Meta lead capture remarks do not count."
      );
    }
    if (!hasMappedProjectLocation(lead)) {
      throw new BadRequestException(
          "Edit the project location from the map before assigning this lead."
      );
    }
  }

  private boolean hasUserFollowUpRemark(LeadEntity lead) {
    if (isMeaningfulRemark(lead.getPresalesRemarks())) {
      return true;
    }
    if (isMeaningfulRemark(lead.getNotes())) {
      return true;
    }
    return lead.getRemarks().stream()
        .flatMap(remark -> remark.getVersions().stream())
        .map(version -> version.getContent())
        .anyMatch(this::isMeaningfulRemark);
  }

  private boolean isMeaningfulRemark(String value) {
    String trimmed = trimToNull(value);
    return trimmed != null && !isMetaCaptureRemark(trimmed);
  }

  private boolean isMetaCaptureRemark(String value) {
    String normalized = value.toLowerCase(Locale.ROOT);
    return normalized.startsWith("meta lead captured.")
        || normalized.contains("leadgen id:")
        || normalized.contains("form id:")
        || normalized.contains("ad id:")
        || normalized.contains("created:");
  }

  private boolean hasMappedProjectLocation(LeadEntity lead) {
    String location = trimToNull(lead.getProjectLocation());
    String state = trimToNull(lead.getProjectState());
    String propertyType = trimToNull(lead.getPropertyType());
    String projectStage = trimToNull(lead.getProjectStage());
    if (location == null || state == null) {
      return false;
    }
    if (propertyType != null && location.equalsIgnoreCase(propertyType)) {
      return false;
    }
    return projectStage == null || !location.equalsIgnoreCase(projectStage);
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
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

  private LeadStatus parseStatusFilter(String value) {
    if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value)) {
      return null;
    }
    return leadRequestValidator.parseStatus(value);
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

  private LeadDtos.LeadResponse toLeadResponse(
      LeadEntity lead,
      LeadDtos.WhatsappDispatchLog whatsappDispatchLog
  ) {
    return leadMapper.toResponse(
        lead,
        leadStatusHistoryService.getLeadHistory(lead.getId()),
        whatsappDispatchLog
    );
  }
}
