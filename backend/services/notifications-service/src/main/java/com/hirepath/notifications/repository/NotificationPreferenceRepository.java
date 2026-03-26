package com.hirepath.notifications.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.notifications.domain.NotificationChannel;
import com.hirepath.notifications.domain.NotificationPreference;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, UUID> {
    Optional<NotificationPreference> findByUserIdAndChannel(UUID userId, NotificationChannel channel);
}
