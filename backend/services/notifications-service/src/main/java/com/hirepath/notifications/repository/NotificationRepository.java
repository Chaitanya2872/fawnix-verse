package com.hirepath.notifications.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.notifications.domain.Notification;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Optional<Notification> findByTenantIdAndIdempotencyKey(String tenantId, String idempotencyKey);
}
