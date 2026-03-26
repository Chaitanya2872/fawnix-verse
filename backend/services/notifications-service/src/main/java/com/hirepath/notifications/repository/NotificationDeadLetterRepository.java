package com.hirepath.notifications.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.notifications.domain.NotificationDeadLetter;

public interface NotificationDeadLetterRepository extends JpaRepository<NotificationDeadLetter, UUID> {
}
