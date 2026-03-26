package com.hirepath.recruitment.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import com.hirepath.recruitment.client.NotificationsClient;
import com.hirepath.recruitment.client.dto.NotificationContentRequest;
import com.hirepath.recruitment.client.dto.RecipientTargetRequest;
import com.hirepath.recruitment.client.dto.SendNotificationRequest;
import com.hirepath.recruitment.domain.RecruitmentAuditLog;
import com.hirepath.recruitment.repository.RecruitmentAuditLogRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class RecruitmentEventService {

    private static final Logger logger = LoggerFactory.getLogger(RecruitmentEventService.class);

    private final RecruitmentAuditLogRepository auditLogRepository;
    private final NotificationsClient notificationsClient;

    public RecruitmentEventService(
        RecruitmentAuditLogRepository auditLogRepository,
        NotificationsClient notificationsClient
    ) {
        this.auditLogRepository = auditLogRepository;
        this.notificationsClient = notificationsClient;
    }

    public void audit(String entityType, String entityId, String action, String actorId, Map<String, Object> metadata) {
        RecruitmentAuditLog log = new RecruitmentAuditLog();
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setAction(action);
        log.setActorId(actorId);
        log.setMetadata(metadata);
        auditLogRepository.save(log);
    }

    public void notifyEvent(String eventType, String title, String body, String actorId, String recipientUserId, String deeplink) {
        if (notificationsClient == null) {
            return;
        }
        try {
            SendNotificationRequest request = new SendNotificationRequest();
            request.setTenantId("default");
            request.setModule("recruitment");
            request.setEventType(eventType);
            RecipientTargetRequest recipient = new RecipientTargetRequest();
            recipient.setUserId(recipientUserId);
            request.setRecipients(List.of(recipient));
            request.setChannels(List.of("IN_APP"));
            NotificationContentRequest content = new NotificationContentRequest();
            content.setTitle(title);
            content.setBodyText(body);
            request.setContent(content);
            request.setDeeplinkUrl(deeplink);
            request.setIdempotencyKey(eventType + ":" + actorId + ":" + OffsetDateTime.now().toEpochSecond());
            notificationsClient.sendEvent(request);
        } catch (Exception ex) {
            logger.warn("Failed to emit notification event {}", eventType, ex);
        }
    }
}
