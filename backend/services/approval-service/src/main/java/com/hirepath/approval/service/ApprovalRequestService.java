package com.hirepath.approval.service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hirepath.approval.domain.ApprovalAction;
import com.hirepath.approval.domain.ApprovalActionType;
import com.hirepath.approval.domain.ApprovalAssignmentStatus;
import com.hirepath.approval.domain.ApprovalFlow;
import com.hirepath.approval.domain.ApprovalFlowStage;
import com.hirepath.approval.domain.ApprovalPriority;
import com.hirepath.approval.domain.ApprovalRequest;
import com.hirepath.approval.domain.ApprovalRequestAssignment;
import com.hirepath.approval.domain.ApprovalRequestStage;
import com.hirepath.approval.domain.ApprovalRequestStatus;
import com.hirepath.approval.domain.ApprovalStageStatus;
import com.hirepath.approval.domain.AssigneeType;
import com.hirepath.approval.dto.ApprovalRequestActionRequest;
import com.hirepath.approval.dto.ApprovalRequestCreateRequest;
import com.hirepath.approval.dto.InternalApprovalActionRequest;
import com.hirepath.approval.repository.ApprovalFlowRepository;
import com.hirepath.approval.repository.ApprovalRequestRepository;
import com.hirepath.approval.security.service.AppUserDetails;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApprovalRequestService {

    private final ApprovalFlowRepository flowRepository;
    private final ApprovalRequestRepository requestRepository;
    private final ApprovalAccessService accessService;
    private final ApprovalNotificationService notificationService;
    private final ApprovalModuleSyncService moduleSyncService;
    private final ObjectMapper objectMapper;

    public ApprovalRequestService(
        ApprovalFlowRepository flowRepository,
        ApprovalRequestRepository requestRepository,
        ApprovalAccessService accessService,
        ApprovalNotificationService notificationService,
        ApprovalModuleSyncService moduleSyncService,
        ObjectMapper objectMapper
    ) {
        this.flowRepository = flowRepository;
        this.requestRepository = requestRepository;
        this.accessService = accessService;
        this.notificationService = notificationService;
        this.moduleSyncService = moduleSyncService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ApprovalRequest createRequest(ApprovalRequestCreateRequest request, AppUserDetails user, boolean internal) {
        validateRequest(request);
        UUID flowId = UUID.fromString(request.getFlowId());
        ApprovalFlow flow = flowRepository.findById(flowId).orElse(null);
        if (flow == null || !flow.isActive()) {
            throw new IllegalArgumentException("Invalid approval flow");
        }
        List<ApprovalFlowStage> flowStages = flow.getStages().stream()
            .sorted(Comparator.comparing(ApprovalFlowStage::getOrderIndex))
            .toList();
        if (flowStages.isEmpty()) {
            throw new IllegalArgumentException("Approval flow has no stages");
        }

        boolean submit = request.getSubmit() == null || request.getSubmit();
        OffsetDateTime now = OffsetDateTime.now();

        ApprovalRequest entity = new ApprovalRequest();
        entity.setFlowId(flowId);
        entity.setModule(request.getModule().trim().toLowerCase(Locale.ROOT));
        entity.setEntityType(request.getEntityType().trim().toLowerCase(Locale.ROOT));
        entity.setEntityId(request.getEntityId());
        entity.setTitle(request.getTitle());
        entity.setSummary(request.getSummary());
        entity.setRequesterId(resolveRequesterId(request, user, internal));
        entity.setRequesterName(resolveRequesterName(request, user, internal));
        entity.setRequestedAt(now);
        entity.setStatus(submit ? ApprovalRequestStatus.PENDING : ApprovalRequestStatus.DRAFT);
        entity.setPriority(parsePriority(request.getPriority()));
        entity.setDueAt(parseDueAt(request.getDueAt()));
        entity.setPayloadSnapshot(serializePayload(request.getPayloadSnapshot()));

        List<ApprovalRequestStage> stages = new ArrayList<>();
        ApprovalRequestStage firstStage = null;
        int index = 0;
        for (ApprovalFlowStage stage : flowStages) {
            ApprovalRequestStage reqStage = new ApprovalRequestStage();
            reqStage.setRequest(entity);
            reqStage.setStageOrder(stage.getOrderIndex());
            reqStage.setRole(stage.getRole());
            reqStage.setApproverUserId(stage.getApproverUserId() != null ? stage.getApproverUserId().toString() : null);
            reqStage.setActionLabel(stage.getActionLabel());
            reqStage.setRequiresAll(stage.isRequiresAll());
            reqStage.setSlaDays(stage.getSlaDays());
            if (submit && index == 0) {
                reqStage.setStatus(ApprovalStageStatus.PENDING);
                reqStage.setDueAt(computeDueAt(stage.getSlaDays(), now));
                firstStage = reqStage;
            } else {
                reqStage.setStatus(ApprovalStageStatus.DRAFT);
            }
            reqStage.setAssignments(buildAssignments(reqStage));
            stages.add(reqStage);
            index++;
        }
        entity.setStages(stages);
        entity.setCurrentStage(firstStage);

        ApprovalAction created = new ApprovalAction();
        created.setRequest(entity);
        created.setStage(firstStage);
        created.setActorId(entity.getRequesterId());
        created.setActionType(ApprovalActionType.CREATED);
        created.setPreviousStatus(null);
        created.setNewStatus(entity.getStatus().getValue());
        created.setComment(null);
        entity.getActions().add(created);

        ApprovalRequest saved = requestRepository.save(entity);
        if (submit && firstStage != null) {
            notificationService.notifyAssignments(saved, firstStage);
        }
        return saved;
    }

    public ApprovalRequest getDetailed(UUID id) {
        return requestRepository.findDetailedById(id);
    }

    @Transactional
    public ApprovalRequest handleInternalAction(UUID id, InternalApprovalActionRequest actionRequest) {
        if (actionRequest == null || actionRequest.getActorId() == null || actionRequest.getActorId().isBlank()) {
            throw new IllegalArgumentException("actor_id is required");
        }
        AppUserDetails user = new AppUserDetails(
            actionRequest.getActorId(),
            actionRequest.getActorEmail() != null ? actionRequest.getActorEmail() : "",
            actionRequest.getActorName(),
            actionRequest.getActorRoles() != null ? actionRequest.getActorRoles() : List.of(),
            List.of()
        );
        ApprovalRequestActionRequest action = new ApprovalRequestActionRequest();
        action.setAction(actionRequest.getAction());
        action.setComment(actionRequest.getComment());
        return handleAction(id, action, user);
    }

    @Transactional
    public ApprovalRequest handleAction(UUID id, ApprovalRequestActionRequest actionRequest, AppUserDetails user) {
        ApprovalRequest request = requestRepository.findDetailedById(id);
        if (request == null) {
            return null;
        }
        if (actionRequest == null || actionRequest.getAction() == null) {
            throw new IllegalArgumentException("action is required");
        }

        ApprovalActionType actionType = parseAction(actionRequest.getAction());
        ApprovalRequestStatus previousStatus = request.getStatus();
        OffsetDateTime now = OffsetDateTime.now();

        if (actionType == ApprovalActionType.CANCELLED) {
            if (!accessService.isRequester(user, request) && !accessService.isAdminOrHr(user)) {
                throw new IllegalArgumentException("Not allowed to cancel");
            }
            if (request.getStatus() == ApprovalRequestStatus.APPROVED
                || request.getStatus() == ApprovalRequestStatus.REJECTED
                || request.getStatus() == ApprovalRequestStatus.CANCELLED) {
                throw new IllegalArgumentException("Request is already closed");
            }
            ApprovalRequestStage stage = request.getCurrentStage();
            if (stage != null) {
                stage.setStatus(ApprovalStageStatus.CANCELLED);
                stage.setCompletedAt(now);
            }
            request.setStatus(ApprovalRequestStatus.CANCELLED);
            request.setCurrentStage(null);
            recordAction(request, stage, user, actionType, previousStatus, request.getStatus(), actionRequest.getComment());
            ApprovalRequest saved = requestRepository.save(request);
            moduleSyncService.syncFinalStatus(saved);
            return saved;
        }

        if (actionType == ApprovalActionType.RESUBMITTED) {
            if (!accessService.isRequester(user, request) && !accessService.isAdminOrHr(user)) {
                throw new IllegalArgumentException("Not allowed to resubmit");
            }
            if (request.getStatus() != ApprovalRequestStatus.CHANGES_REQUESTED
                && request.getStatus() != ApprovalRequestStatus.DRAFT) {
                throw new IllegalArgumentException("Request is not in a resubmittable state");
            }
            resetStages(request, now);
            request.setStatus(ApprovalRequestStatus.PENDING);
            recordAction(request, request.getCurrentStage(), user, actionType, previousStatus, request.getStatus(), actionRequest.getComment());
            if (request.getCurrentStage() != null) {
                notificationService.notifyAssignments(request, request.getCurrentStage());
            }
            return requestRepository.save(request);
        }

        ApprovalRequestStage stage = request.getCurrentStage();
        if (stage == null) {
            throw new IllegalArgumentException("No active stage");
        }
        if (!accessService.canAct(user, request)) {
            throw new IllegalArgumentException("Not allowed to act on this request");
        }
        ApprovalRequestAssignment assignment = findAssignmentForUser(stage, user);
        if (assignment != null) {
            assignment.setActedAt(now);
        }

        if (actionType == ApprovalActionType.APPROVED) {
            boolean forceApprove = assignment == null && accessService.isAdminOrHr(user);
            if (assignment != null) {
                assignment.setStatus(ApprovalAssignmentStatus.APPROVED);
            }
            if (forceApprove) {
                markAllAssignments(stage, ApprovalAssignmentStatus.APPROVED, now);
                stage.setStatus(ApprovalStageStatus.APPROVED);
                stage.setCompletedAt(now);
                advanceToNextStage(request, stage, now);
            } else if (stage.isRequiresAll()) {
                if (allAssignmentsApproved(stage)) {
                    stage.setStatus(ApprovalStageStatus.APPROVED);
                    stage.setCompletedAt(now);
                    advanceToNextStage(request, stage, now);
                } else {
                    stage.setStatus(ApprovalStageStatus.IN_REVIEW);
                    request.setStatus(ApprovalRequestStatus.IN_REVIEW);
                }
            } else {
                stage.setStatus(ApprovalStageStatus.APPROVED);
                stage.setCompletedAt(now);
                cancelOtherAssignments(stage, assignment);
                advanceToNextStage(request, stage, now);
            }
        } else if (actionType == ApprovalActionType.REJECTED) {
            if (assignment != null) {
                assignment.setStatus(ApprovalAssignmentStatus.REJECTED);
            }
            if (assignment == null && accessService.isAdminOrHr(user)) {
                markAllAssignments(stage, ApprovalAssignmentStatus.REJECTED, now);
            }
            stage.setStatus(ApprovalStageStatus.REJECTED);
            stage.setCompletedAt(now);
            cancelOtherAssignments(stage, assignment);
            request.setStatus(ApprovalRequestStatus.REJECTED);
            request.setCurrentStage(null);
        } else if (actionType == ApprovalActionType.CHANGES_REQUESTED) {
            if (assignment != null) {
                assignment.setStatus(ApprovalAssignmentStatus.CHANGES_REQUESTED);
            }
            if (assignment == null && accessService.isAdminOrHr(user)) {
                markAllAssignments(stage, ApprovalAssignmentStatus.CHANGES_REQUESTED, now);
            }
            stage.setStatus(ApprovalStageStatus.CHANGES_REQUESTED);
            stage.setCompletedAt(now);
            cancelOtherAssignments(stage, assignment);
            request.setStatus(ApprovalRequestStatus.CHANGES_REQUESTED);
            request.setCurrentStage(null);
        }

        recordAction(request, stage, user, actionType, previousStatus, request.getStatus(), actionRequest.getComment());
        ApprovalRequest saved = requestRepository.save(request);
        moduleSyncService.syncFinalStatus(saved);
        return saved;
    }

    public ApprovalRequest findByEntity(String module, String entityType, String entityId) {
        String normalizedModule = module != null ? module.trim().toLowerCase(Locale.ROOT) : null;
        String normalizedEntityType = entityType != null ? entityType.trim().toLowerCase(Locale.ROOT) : null;
        return requestRepository.findByEntity(normalizedModule, normalizedEntityType, entityId);
    }

    private void validateRequest(ApprovalRequestCreateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (request.getFlowId() == null || request.getFlowId().isBlank()) {
            throw new IllegalArgumentException("flow_id is required");
        }
        if (request.getModule() == null || request.getModule().isBlank()) {
            throw new IllegalArgumentException("module is required");
        }
        if (request.getEntityType() == null || request.getEntityType().isBlank()) {
            throw new IllegalArgumentException("entity_type is required");
        }
        if (request.getEntityId() == null || request.getEntityId().isBlank()) {
            throw new IllegalArgumentException("entity_id is required");
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new IllegalArgumentException("title is required");
        }
    }

    private String resolveRequesterId(ApprovalRequestCreateRequest request, AppUserDetails user, boolean internal) {
        if (internal) {
            if (request.getRequesterId() == null || request.getRequesterId().isBlank()) {
                throw new IllegalArgumentException("requester_id is required");
            }
            return request.getRequesterId();
        }
        if (user == null || user.getUserId() == null) {
            throw new IllegalArgumentException("User context missing");
        }
        return user.getUserId();
    }

    private String resolveRequesterName(ApprovalRequestCreateRequest request, AppUserDetails user, boolean internal) {
        if (internal) {
            return request.getRequesterName();
        }
        return user != null ? user.getFullName() : null;
    }

    private ApprovalPriority parsePriority(String priority) {
        if (priority == null || priority.isBlank()) {
            return ApprovalPriority.MEDIUM;
        }
        try {
            return ApprovalPriority.valueOf(priority.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return ApprovalPriority.MEDIUM;
        }
    }

    private OffsetDateTime parseDueAt(String dueAt) {
        if (dueAt == null || dueAt.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(dueAt);
        } catch (Exception ex) {
            return null;
        }
    }

    private String serializePayload(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    private List<ApprovalRequestAssignment> buildAssignments(ApprovalRequestStage stage) {
        List<ApprovalRequestAssignment> assignments = new ArrayList<>();
        ApprovalAssignmentStatus initialStatus = stage.getStatus() == ApprovalStageStatus.DRAFT
            ? ApprovalAssignmentStatus.DRAFT
            : ApprovalAssignmentStatus.PENDING;
        if (stage.getApproverUserId() != null && !stage.getApproverUserId().isBlank()) {
            ApprovalRequestAssignment assignment = new ApprovalRequestAssignment();
            assignment.setStage(stage);
            assignment.setAssigneeType(AssigneeType.USER);
            assignment.setAssigneeValue(stage.getApproverUserId());
            assignment.setStatus(initialStatus);
            assignments.add(assignment);
        }
        if (stage.getRole() != null && !stage.getRole().isBlank()) {
            ApprovalRequestAssignment assignment = new ApprovalRequestAssignment();
            assignment.setStage(stage);
            assignment.setAssigneeType(AssigneeType.ROLE);
            assignment.setAssigneeValue(stage.getRole());
            assignment.setStatus(initialStatus);
            assignments.add(assignment);
        }
        return assignments;
    }

    private ApprovalRequestAssignment findAssignmentForUser(ApprovalRequestStage stage, AppUserDetails user) {
        if (stage == null || stage.getAssignments() == null || user == null) {
            return null;
        }
        for (ApprovalRequestAssignment assignment : stage.getAssignments()) {
            if (assignment.getAssigneeType() == AssigneeType.USER) {
                if (assignment.getAssigneeValue() != null && assignment.getAssigneeValue().equals(user.getUserId())) {
                    return assignment;
                }
            }
            if (assignment.getAssigneeType() == AssigneeType.ROLE && user.getRoleNames() != null) {
                if (assignment.getAssigneeValue() != null && user.getRoleNames().stream()
                    .anyMatch(role -> normalizeRole(role).equals(normalizeRole(assignment.getAssigneeValue())))) {
                    return assignment;
                }
            }
        }
        return null;
    }

    private boolean allAssignmentsApproved(ApprovalRequestStage stage) {
        if (stage.getAssignments() == null || stage.getAssignments().isEmpty()) {
            return true;
        }
        return stage.getAssignments().stream().allMatch(assign -> assign.getStatus() == ApprovalAssignmentStatus.APPROVED);
    }

    private void cancelOtherAssignments(ApprovalRequestStage stage, ApprovalRequestAssignment acted) {
        if (stage.getAssignments() == null) {
            return;
        }
        for (ApprovalRequestAssignment assignment : stage.getAssignments()) {
            if (acted != null && assignment.getId() != null && assignment.getId().equals(acted.getId())) {
                continue;
            }
            if (assignment.getStatus() == ApprovalAssignmentStatus.PENDING) {
                assignment.setStatus(ApprovalAssignmentStatus.CANCELLED);
            }
        }
    }

    private void markAllAssignments(ApprovalRequestStage stage, ApprovalAssignmentStatus status, OffsetDateTime actedAt) {
        if (stage.getAssignments() == null) {
            return;
        }
        for (ApprovalRequestAssignment assignment : stage.getAssignments()) {
            assignment.setStatus(status);
            assignment.setActedAt(actedAt);
        }
    }

    private void advanceToNextStage(ApprovalRequest request, ApprovalRequestStage completed, OffsetDateTime now) {
        ApprovalRequestStage next = nextStage(request, completed);
        if (next == null) {
            request.setStatus(ApprovalRequestStatus.APPROVED);
            request.setCurrentStage(null);
            return;
        }
        next.setStatus(ApprovalStageStatus.PENDING);
        next.setDueAt(computeDueAt(next.getSlaDays(), now));
        if (next.getAssignments() != null) {
            for (ApprovalRequestAssignment assignment : next.getAssignments()) {
                if (assignment.getStatus() == ApprovalAssignmentStatus.DRAFT) {
                    assignment.setStatus(ApprovalAssignmentStatus.PENDING);
                }
            }
        }
        request.setCurrentStage(next);
        request.setStatus(ApprovalRequestStatus.IN_REVIEW);
        notificationService.notifyAssignments(request, next);
    }

    private ApprovalRequestStage nextStage(ApprovalRequest request, ApprovalRequestStage current) {
        if (request.getStages() == null || current == null) {
            return null;
        }
        return request.getStages().stream()
            .filter(stage -> stage.getStageOrder() > current.getStageOrder())
            .sorted(Comparator.comparing(ApprovalRequestStage::getStageOrder))
            .findFirst()
            .orElse(null);
    }

    private void resetStages(ApprovalRequest request, OffsetDateTime now) {
        if (request.getStages() == null || request.getStages().isEmpty()) {
            return;
        }
        ApprovalRequestStage first = request.getStages().stream()
            .sorted(Comparator.comparing(ApprovalRequestStage::getStageOrder))
            .findFirst()
            .orElse(null);
        for (ApprovalRequestStage stage : request.getStages()) {
            stage.setStatus(ApprovalStageStatus.DRAFT);
            stage.setCompletedAt(null);
            stage.setDueAt(null);
            stage.setOverdueNotifiedAt(null);
            if (stage.getAssignments() != null) {
                for (ApprovalRequestAssignment assignment : stage.getAssignments()) {
                    assignment.setStatus(ApprovalAssignmentStatus.DRAFT);
                    assignment.setActedAt(null);
                }
            }
        }
        if (first != null) {
            first.setStatus(ApprovalStageStatus.PENDING);
            first.setDueAt(computeDueAt(first.getSlaDays(), now));
            if (first.getAssignments() != null) {
                for (ApprovalRequestAssignment assignment : first.getAssignments()) {
                    assignment.setStatus(ApprovalAssignmentStatus.PENDING);
                }
            }
        }
        request.setCurrentStage(first);
        request.setRequestedAt(now);
    }

    private OffsetDateTime computeDueAt(Integer slaDays, OffsetDateTime base) {
        if (slaDays == null || base == null) {
            return null;
        }
        return base.plusDays(slaDays);
    }

    private ApprovalActionType parseAction(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("action is required");
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT).replace("-", "_");
        if ("APPROVE".equals(normalized)) {
            normalized = "APPROVED";
        }
        if ("REJECT".equals(normalized)) {
            normalized = "REJECTED";
        }
        if ("CANCEL".equals(normalized)) {
            normalized = "CANCELLED";
        }
        if ("REQUEST_CHANGES".equals(normalized)) {
            normalized = "CHANGES_REQUESTED";
        }
        if ("RESUBMIT".equals(normalized)) {
            normalized = "RESUBMITTED";
        }
        try {
            return ApprovalActionType.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid action");
        }
    }

    private void recordAction(
        ApprovalRequest request,
        ApprovalRequestStage stage,
        AppUserDetails user,
        ApprovalActionType actionType,
        ApprovalRequestStatus previousStatus,
        ApprovalRequestStatus newStatus,
        String comment
    ) {
        ApprovalAction action = new ApprovalAction();
        action.setRequest(request);
        action.setStage(stage);
        action.setActorId(user != null ? user.getUserId() : null);
        action.setActionType(actionType);
        action.setPreviousStatus(previousStatus != null ? previousStatus.getValue() : null);
        action.setNewStatus(newStatus != null ? newStatus.getValue() : null);
        action.setComment(comment);
        request.getActions().add(action);
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "";
        }
        String normalized = role.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith("role_")) {
            normalized = normalized.substring(5);
        }
        return normalized;
    }
}
