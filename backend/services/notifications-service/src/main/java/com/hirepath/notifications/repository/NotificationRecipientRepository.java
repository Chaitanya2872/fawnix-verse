package com.hirepath.notifications.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.notifications.domain.NotificationRecipient;

public interface NotificationRecipientRepository extends JpaRepository<NotificationRecipient, UUID> {
    List<NotificationRecipient> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<NotificationRecipient> findByNotification_Id(UUID notificationId);
}
