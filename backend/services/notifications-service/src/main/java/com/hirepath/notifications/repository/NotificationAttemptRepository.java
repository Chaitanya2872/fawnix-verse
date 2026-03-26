package com.hirepath.notifications.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.notifications.domain.NotificationAttempt;

public interface NotificationAttemptRepository extends JpaRepository<NotificationAttempt, UUID> {
}
