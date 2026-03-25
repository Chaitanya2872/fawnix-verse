package com.hirepath.notifications.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.notifications.domain.NotificationSubscription;

public interface NotificationSubscriptionRepository extends JpaRepository<NotificationSubscription, UUID> {
    Optional<NotificationSubscription> findByUserIdAndEndpoint(UUID userId, String endpoint);
    Optional<NotificationSubscription> findTopByUserIdOrderByCreatedAtDesc(UUID userId);
}
