package com.hirepath.task.tasks.service;

import com.hirepath.task.client.NotificationsClient;
import com.hirepath.task.client.dto.NotificationContentRequest;
import com.hirepath.task.client.dto.RecipientTargetRequest;
import com.hirepath.task.client.dto.SendNotificationRequest;
import com.hirepath.task.tasks.domain.TaskSpaceEntity;
import com.hirepath.task.tasks.domain.TaskSpaceInvitationEntity;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class TaskSpaceNotificationService {

  private final NotificationsClient notificationsClient;

  public TaskSpaceNotificationService(NotificationsClient notificationsClient) {
    this.notificationsClient = notificationsClient;
  }

  public void sendInvitation(TaskSpaceInvitationEntity invitation, TaskSpaceEntity space) {
    SendNotificationRequest request = new SendNotificationRequest();
    request.setModule("tasks");
    request.setEventType("space_invitation");
    request.setChannels(List.of("in_app", "web_push"));
    request.setTemplateKey("task-space-invitation");
    request.setDeeplinkUrl("/tasks");
    request.setPriority("normal");
    request.setIdempotencyKey("task-space-invitation-" + invitation.getId());
    request.setVariables(Map.of(
        "spaceName", space.getName(),
        "invitedBy", invitation.getInvitedByName(),
        "role", invitation.getRole().name(),
        "invitationId", invitation.getId()
    ));

    RecipientTargetRequest recipient = new RecipientTargetRequest();
    recipient.setUserId(invitation.getInviteeUserId());
    request.setRecipients(List.of(recipient));

    NotificationContentRequest content = new NotificationContentRequest();
    content.setTitle("Space invitation");
    content.setBodyText(invitation.getInvitedByName() + " invited you to " + space.getName() + " as " + invitation.getRole().name() + ".");
    request.setContent(content);

    try {
      notificationsClient.sendEvent(request);
    } catch (Exception ignored) {
    }
  }
}
