package com.hirepath.notifications.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hirepath.notifications.domain.NotificationOutbox;
import com.hirepath.notifications.domain.NotificationOutboxStatus;

public interface NotificationOutboxRepository extends JpaRepository<NotificationOutbox, UUID> {

    @Query("select o from NotificationOutbox o where o.status in :statuses and (o.nextRetryAt is null or o.nextRetryAt <= :now) order by o.createdAt asc")
    List<NotificationOutbox> findDueOutbox(@Param("statuses") List<NotificationOutboxStatus> statuses, @Param("now") OffsetDateTime now);

    List<NotificationOutbox> findByRecipient_Id(UUID recipientId);
}
