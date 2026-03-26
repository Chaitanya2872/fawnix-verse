package com.hirepath.approval.service;

import java.util.List;

import com.hirepath.approval.domain.ApprovalRequest;
import com.hirepath.approval.domain.ApprovalRequestAssignment;
import com.hirepath.approval.domain.ApprovalRequestStage;
import com.hirepath.approval.domain.AssigneeType;
import com.hirepath.approval.security.service.AppUserDetails;

import org.springframework.stereotype.Service;

@Service
public class ApprovalAccessService {

    public boolean isAdminOrHr(AppUserDetails user) {
        if (user == null || user.getRoleNames() == null) {
            return false;
        }
        return hasRole(user.getRoleNames(), "admin") || hasRole(user.getRoleNames(), "hr_manager");
    }

    public boolean isRequester(AppUserDetails user, ApprovalRequest request) {
        if (user == null || request == null) {
            return false;
        }
        return user.getUserId() != null && user.getUserId().equals(request.getRequesterId());
    }

    public boolean canView(AppUserDetails user, ApprovalRequest request) {
        if (user == null || request == null) {
            return false;
        }
        if (isAdminOrHr(user) || isRequester(user, request)) {
            return true;
        }
        return isAssignedToAnyStage(user, request);
    }

    public boolean canAct(AppUserDetails user, ApprovalRequest request) {
        if (user == null || request == null) {
            return false;
        }
        ApprovalRequestStage stage = request.getCurrentStage();
        if (stage == null) {
            return false;
        }
        if (isAdminOrHr(user)) {
            return true;
        }
        return isAssignedToStage(user, stage);
    }

    public boolean isAssignedToStage(AppUserDetails user, ApprovalRequestStage stage) {
        if (user == null || stage == null) {
            return false;
        }
        List<ApprovalRequestAssignment> assignments = stage.getAssignments();
        if (assignments == null) {
            return false;
        }
        for (ApprovalRequestAssignment assignment : assignments) {
            if (assignment.getAssigneeType() == AssigneeType.USER) {
                if (assignment.getAssigneeValue() != null && assignment.getAssigneeValue().equals(user.getUserId())) {
                    return true;
                }
            }
            if (assignment.getAssigneeType() == AssigneeType.ROLE) {
                if (assignment.getAssigneeValue() != null && user.getRoleNames() != null
                    && user.getRoleNames().stream().anyMatch(role ->
                        normalizeRole(role).equals(normalizeRole(assignment.getAssigneeValue())))) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean isAssignedToAnyStage(AppUserDetails user, ApprovalRequest request) {
        if (user == null || request == null || request.getStages() == null) {
            return false;
        }
        for (ApprovalRequestStage stage : request.getStages()) {
            if (isAssignedToStage(user, stage)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasRole(List<String> roles, String target) {
        if (roles == null) {
            return false;
        }
        return roles.stream().anyMatch(role -> role != null && normalizeRole(role).equals(normalizeRole(target)));
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "";
        }
        String normalized = role.trim().toLowerCase();
        if (normalized.startsWith("role_")) {
            normalized = normalized.substring(5);
        }
        return normalized;
    }
}
