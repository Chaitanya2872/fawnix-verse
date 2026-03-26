package com.hirepath.approval.service;

import com.hirepath.approval.client.RecruitmentApprovalClient;
import com.hirepath.approval.client.dto.RecruitmentApprovalStatusRequest;
import com.hirepath.approval.domain.ApprovalRequest;
import com.hirepath.approval.domain.ApprovalRequestStatus;

import org.springframework.stereotype.Service;

@Service
public class ApprovalModuleSyncService {

    private final RecruitmentApprovalClient recruitmentApprovalClient;

    public ApprovalModuleSyncService(RecruitmentApprovalClient recruitmentApprovalClient) {
        this.recruitmentApprovalClient = recruitmentApprovalClient;
    }

    public void syncFinalStatus(ApprovalRequest request) {
        if (request == null || request.getModule() == null || request.getStatus() == null) {
            return;
        }
        if (!"recruitment".equalsIgnoreCase(request.getModule())) {
            return;
        }
        if (request.getStatus() != ApprovalRequestStatus.APPROVED
            && request.getStatus() != ApprovalRequestStatus.REJECTED
            && request.getStatus() != ApprovalRequestStatus.CANCELLED) {
            return;
        }
        RecruitmentApprovalStatusRequest payload = new RecruitmentApprovalStatusRequest();
        payload.setModule(request.getModule());
        payload.setEntityType(request.getEntityType());
        payload.setEntityId(request.getEntityId());
        payload.setStatus(request.getStatus().getValue());
        payload.setApprovalRequestId(request.getId() != null ? request.getId().toString() : null);
        try {
            recruitmentApprovalClient.updateStatus(payload);
        } catch (Exception ignored) {
        }
    }
}
