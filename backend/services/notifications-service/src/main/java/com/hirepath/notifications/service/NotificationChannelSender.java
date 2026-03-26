package com.hirepath.notifications.service;

import com.hirepath.notifications.domain.Notification;
import com.hirepath.notifications.domain.NotificationChannel;
import com.hirepath.notifications.domain.NotificationRecipient;

public interface NotificationChannelSender {
    NotificationChannel channel();
    DeliveryResult send(Notification notification, NotificationRecipient recipient);
}
