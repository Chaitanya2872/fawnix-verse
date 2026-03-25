package com.hirepath.notifications.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.hirepath.notifications.domain.Notification;
import com.hirepath.notifications.domain.NotificationChannel;
import com.hirepath.notifications.domain.NotificationRecipient;
import com.hirepath.notifications.repository.NotificationSubscriptionRepository;

@Component
public class WebPushNotificationSender implements NotificationChannelSender {

    private static final Logger log = LoggerFactory.getLogger(WebPushNotificationSender.class);

    private final NotificationSubscriptionRepository subscriptionRepository;
    private final TemplateResolver templateResolver;

    public WebPushNotificationSender(
        NotificationSubscriptionRepository subscriptionRepository,
        TemplateResolver templateResolver
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.templateResolver = templateResolver;
    }

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.WEB_PUSH;
    }

    @Override
    public DeliveryResult send(Notification notification, NotificationRecipient recipient) {
        if (recipient.getUserId() == null) {
            return DeliveryResult.failed("Missing recipient userId");
        }
        var subscription = subscriptionRepository.findTopByUserIdOrderByCreatedAtDesc(recipient.getUserId()).orElse(null);
        if (subscription == null) {
            return DeliveryResult.failed("No web push subscription registered");
        }
        RenderedTemplate rendered = templateResolver.resolve(notification, NotificationChannel.WEB_PUSH);
        String payload = rendered.getTextBody();
        log.info("Web push (stub) to {} endpoint {} payload {}", recipient.getUserId(), subscription.getEndpoint(), payload);
        return DeliveryResult.ok();
    }
}
