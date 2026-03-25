package com.hirepath.approval.service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hirepath.approval.domain.ApprovalRequest;
import com.hirepath.approval.domain.ApprovalRequestAssignment;
import com.hirepath.approval.domain.ApprovalRequestStage;
import com.hirepath.approval.domain.ApprovalRequestStatus;
import com.hirepath.approval.domain.ApprovalStageStatus;
import com.hirepath.approval.domain.AssigneeType;
import com.hirepath.approval.repository.ApprovalRequestAssignmentRepository;
import com.hirepath.approval.repository.ApprovalRequestRepository;
import com.hirepath.approval.security.service.AppUserDetails;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ApprovalQueryService {

    private final ApprovalRequestRepository requestRepository;
    private final ApprovalRequestAssignmentRepository assignmentRepository;
    private final ApprovalAccessService accessService;

    public ApprovalQueryService(
        ApprovalRequestRepository requestRepository,
        ApprovalRequestAssignmentRepository assignmentRepository,
        ApprovalAccessService accessService
    ) {
        this.requestRepository = requestRepository;
        this.assignmentRepository = assignmentRepository;
        this.accessService = accessService;
    }

    public List<ApprovalRequest> inbox(AppUserDetails user) {
        if (user == null) {
            return List.of();
        }
        Set<UUID> requestIds = new HashSet<>();
        List<ApprovalRequest> results = new ArrayList<>();
        if (user.getUserId() != null) {
            List<ApprovalRequestAssignment> assignments = assignmentRepository.findByAssignee(AssigneeType.USER, user.getUserId());
            collectInbox(assignments, requestIds, results);
        }
        if (user.getRoleNames() != null) {
            for (String role : user.getRoleNames()) {
                for (String roleKey : roleKeys(role)) {
                    List<ApprovalRequestAssignment> assignments = assignmentRepository.findByAssignee(AssigneeType.ROLE, roleKey);
                    collectInbox(assignments, requestIds, results);
                }
            }
        }
        return results.stream()
            .sorted(Comparator.comparing(ApprovalRequest::getCreatedAt).reversed())
            .toList();
    }

    public List<ApprovalRequest> outbox(AppUserDetails user) {
        if (user == null || user.getUserId() == null) {
            return List.of();
        }
        return requestRepository.findByRequesterId(user.getUserId(), org.springframework.data.domain.PageRequest.of(0, 1000)).getContent()
            .stream()
            .sorted(Comparator.comparing(ApprovalRequest::getCreatedAt).reversed())
            .toList();
    }

    public List<ApprovalRequest> history(AppUserDetails user) {
        if (user == null) {
            return List.of();
        }
        if (accessService.isAdminOrHr(user)) {
            return requestRepository.findAll().stream()
                .sorted(Comparator.comparing(ApprovalRequest::getCreatedAt).reversed())
                .toList();
        }
        Set<UUID> ids = new HashSet<>();
        List<ApprovalRequest> combined = new ArrayList<>();
        for (ApprovalRequest request : outbox(user)) {
            if (ids.add(request.getId())) {
                combined.add(request);
            }
        }
        for (ApprovalRequest request : inbox(user)) {
            if (ids.add(request.getId())) {
                combined.add(request);
            }
        }
        return combined.stream()
            .sorted(Comparator.comparing(ApprovalRequest::getCreatedAt).reversed())
            .toList();
    }

    public List<ApprovalRequest> applyFilters(
        List<ApprovalRequest> requests,
        String status,
        String module,
        String entityType,
        String entityId,
        String priority,
        Boolean overdue,
        String query
    ) {
        List<ApprovalRequest> filtered = requests;
        if (status != null && !status.isBlank()) {
            String normalized = status.trim().toLowerCase(Locale.ROOT);
            if ("action_required".equals(normalized) || "action-required".equals(normalized)) {
                filtered = filtered.stream()
                    .filter(req -> req.getStatus() == ApprovalRequestStatus.PENDING
                        || req.getStatus() == ApprovalRequestStatus.IN_REVIEW)
                    .toList();
            } else {
                filtered = filtered.stream()
                    .filter(req -> req.getStatus() != null && req.getStatus().getValue().equalsIgnoreCase(normalized))
                    .toList();
            }
        }
        if (module != null && !module.isBlank()) {
            String mod = module.trim().toLowerCase(Locale.ROOT);
            filtered = filtered.stream().filter(req -> req.getModule() != null
                && req.getModule().toLowerCase(Locale.ROOT).equals(mod)).toList();
        }
        if (entityType != null && !entityType.isBlank()) {
            String et = entityType.trim().toLowerCase(Locale.ROOT);
            filtered = filtered.stream().filter(req -> req.getEntityType() != null
                && req.getEntityType().toLowerCase(Locale.ROOT).equals(et)).toList();
        }
        if (entityId != null && !entityId.isBlank()) {
            String eid = entityId.trim();
            filtered = filtered.stream().filter(req -> req.getEntityId() != null
                && req.getEntityId().equalsIgnoreCase(eid)).toList();
        }
        if (priority != null && !priority.isBlank()) {
            String pr = priority.trim().toLowerCase(Locale.ROOT);
            filtered = filtered.stream().filter(req -> req.getPriority() != null
                && req.getPriority().getValue().equalsIgnoreCase(pr)).toList();
        }
        if (query != null && !query.isBlank()) {
            String q = query.trim().toLowerCase(Locale.ROOT);
            filtered = filtered.stream().filter(req -> (req.getTitle() != null && req.getTitle().toLowerCase(Locale.ROOT).contains(q))
                || (req.getSummary() != null && req.getSummary().toLowerCase(Locale.ROOT).contains(q))
                || (req.getEntityId() != null && req.getEntityId().toLowerCase(Locale.ROOT).contains(q)))
                .toList();
        }
        if (overdue != null) {
            boolean value = overdue;
            filtered = filtered.stream().filter(req -> isOverdue(req) == value).toList();
        }
        return filtered;
    }

    public Map<String, Integer> computeKpis(List<ApprovalRequest> requests) {
        Map<String, Integer> counts = new HashMap<>();
        counts.put("total", requests.size());
        counts.put("sent", requests.size());
        counts.put("pending", countByStatus(requests, ApprovalRequestStatus.PENDING));
        counts.put("in_review", countByStatus(requests, ApprovalRequestStatus.IN_REVIEW));
        counts.put("approved", countByStatus(requests, ApprovalRequestStatus.APPROVED));
        counts.put("rejected", countByStatus(requests, ApprovalRequestStatus.REJECTED));
        counts.put("changes_requested", countByStatus(requests, ApprovalRequestStatus.CHANGES_REQUESTED));
        counts.put("cancelled", countByStatus(requests, ApprovalRequestStatus.CANCELLED));
        counts.put("overdue", (int) requests.stream().filter(this::isOverdue).count());
        counts.put("action_required", counts.get("pending") + counts.get("in_review"));
        return counts;
    }

    public List<ApprovalRequest> paginate(List<ApprovalRequest> requests, int skip, int limit) {
        if (limit <= 0) {
            return List.of();
        }
        int total = requests.size();
        int from = Math.min(Math.max(skip, 0), total);
        int to = Math.min(from + limit, total);
        return requests.subList(from, to);
    }

    private void collectInbox(
        List<ApprovalRequestAssignment> assignments,
        Set<UUID> requestIds,
        List<ApprovalRequest> results
    ) {
        if (assignments == null) {
            return;
        }
        for (ApprovalRequestAssignment assignment : assignments) {
            ApprovalRequestStage stage = assignment.getStage();
            if (stage == null || stage.getRequest() == null) {
                continue;
            }
            ApprovalRequest request = stage.getRequest();
            if (request.getCurrentStage() == null || !request.getCurrentStage().getId().equals(stage.getId())) {
                continue;
            }
            if (stage.getStatus() != ApprovalStageStatus.PENDING && stage.getStatus() != ApprovalStageStatus.IN_REVIEW) {
                continue;
            }
            if (requestIds.add(request.getId())) {
                results.add(request);
            }
        }
    }

    private int countByStatus(List<ApprovalRequest> requests, ApprovalRequestStatus status) {
        return (int) requests.stream().filter(req -> req.getStatus() == status).count();
    }

    private boolean isOverdue(ApprovalRequest request) {
        ApprovalRequestStage stage = request.getCurrentStage();
        if (stage == null || stage.getDueAt() == null) {
            return false;
        }
        if (request.getStatus() == ApprovalRequestStatus.APPROVED
            || request.getStatus() == ApprovalRequestStatus.REJECTED
            || request.getStatus() == ApprovalRequestStatus.CANCELLED) {
            return false;
        }
        return stage.getDueAt().isBefore(OffsetDateTime.now());
    }

    private List<String> roleKeys(String role) {
        if (role == null || role.isBlank()) {
            return List.of();
        }
        String normalized = normalizeRole(role);
        String prefixed = "ROLE_" + normalized.toUpperCase(Locale.ROOT);
        if (role.equalsIgnoreCase(normalized) || role.equalsIgnoreCase(prefixed)) {
            return List.of(role, normalized, prefixed).stream().distinct().toList();
        }
        return List.of(role, normalized, prefixed).stream().distinct().toList();
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
