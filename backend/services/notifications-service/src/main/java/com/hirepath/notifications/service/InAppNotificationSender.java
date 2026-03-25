package com.hirepath.notifications.service;

import org.springframework.stereotype.Component;

import com.hirepath.notifications.domain.Notification;
import com.hirepath.notifications.domain.NotificationChannel;
import com.hirepath.notifications.domain.NotificationRecipient;

@Component
public class InAppNotificationSender implements NotificationChannelSender {

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.IN_APP;
    }

    @Override
    public DeliveryResult send(Notification notification, NotificationRecipient recipient) {
        return DeliveryResult.ok();
    }
}
