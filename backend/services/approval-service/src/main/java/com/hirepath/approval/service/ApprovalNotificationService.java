package com.hirepath.approval.service;

import java.util.List;

import com.hirepath.approval.client.NotificationsClient;
import com.hirepath.approval.client.dto.NotificationContentRequest;
import com.hirepath.approval.client.dto.RecipientTargetRequest;
import com.hirepath.approval.client.dto.SendNotificationRequest;
import com.hirepath.approval.domain.ApprovalRequest;
import com.hirepath.approval.domain.ApprovalRequestAssignment;
import com.hirepath.approval.domain.ApprovalRequestStage;
import com.hirepath.approval.domain.AssigneeType;

import org.springframework.stereotype.Service;

@Service
public class ApprovalNotificationService {

    private final NotificationsClient notificationsClient;

    public ApprovalNotificationService(NotificationsClient notificationsClient) {
        this.notificationsClient = notificationsClient;
    }

    public void notifyAssignments(ApprovalRequest request, ApprovalRequestStage stage) {
        if (request == null || stage == null || stage.getAssignments() == null) {
            return;
        }
        for (ApprovalRequestAssignment assignment : stage.getAssignments()) {
            if (assignment.getAssigneeType() != AssigneeType.USER) {
                continue;
            }
            if (assignment.getAssigneeValue() == null || assignment.getAssigneeValue().isBlank()) {
                continue;
            }
            SendNotificationRequest payload = new SendNotificationRequest();
            payload.setModule("approvals");
            payload.setEventType("approval_assignment");
            payload.setChannels(List.of("in_app"));

            RecipientTargetRequest recipient = new RecipientTargetRequest();
            recipient.setUserId(assignment.getAssigneeValue());
            payload.setRecipients(List.of(recipient));

            NotificationContentRequest content = new NotificationContentRequest();
            content.setTitle("Approval required");
            content.setBodyText(request.getTitle());
            payload.setContent(content);
            payload.setDeeplinkUrl("/approvals/inbox");
            payload.setPriority("normal");
            payload.setIdempotencyKey("approval-assignment-" + request.getId() + "-" + stage.getId() + "-" + assignment.getAssigneeValue());

            try {
                notificationsClient.send(payload);
            } catch (Exception ignored) {
            }
        }
    }

    public void notifyOverdue(ApprovalRequest request, ApprovalRequestStage stage) {
        if (request == null || stage == null || stage.getAssignments() == null) {
            return;
        }
        for (ApprovalRequestAssignment assignment : stage.getAssignments()) {
            if (assignment.getAssigneeType() != AssigneeType.USER) {
                continue;
            }
            if (assignment.getAssigneeValue() == null || assignment.getAssigneeValue().isBlank()) {
                continue;
            }
            SendNotificationRequest payload = new SendNotificationRequest();
            payload.setModule("approvals");
            payload.setEventType("approval_overdue");
            payload.setChannels(List.of("in_app"));

            RecipientTargetRequest recipient = new RecipientTargetRequest();
            recipient.setUserId(assignment.getAssigneeValue());
            payload.setRecipients(List.of(recipient));

            NotificationContentRequest content = new NotificationContentRequest();
            content.setTitle("Approval overdue");
            content.setBodyText(request.getTitle());
            payload.setContent(content);
            payload.setDeeplinkUrl("/approvals/inbox");
            payload.setPriority("high");
            payload.setIdempotencyKey("approval-overdue-" + request.getId() + "-" + stage.getId() + "-" + assignment.getAssigneeValue());

            try {
                notificationsClient.send(payload);
            } catch (Exception ignored) {
            }
        }
    }
}
