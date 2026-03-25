package com.hirepath.notifications.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.notifications.domain.NotificationChannel;
import com.hirepath.notifications.domain.NotificationTemplate;

public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, UUID> {
    List<NotificationTemplate> findByKeyAndChannelOrderByVersionDesc(String key, NotificationChannel channel);
    List<NotificationTemplate> findByKeyAndChannelAndLocaleOrderByVersionDesc(String key, NotificationChannel channel, String locale);
    Optional<NotificationTemplate> findTopByKeyAndChannelOrderByVersionDesc(String key, NotificationChannel channel);
    Optional<NotificationTemplate> findTopByKeyAndChannelAndLocaleOrderByVersionDesc(String key, NotificationChannel channel, String locale);
}
