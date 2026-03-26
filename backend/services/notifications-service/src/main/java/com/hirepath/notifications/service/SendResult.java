package com.hirepath.notifications.service;

import java.util.List;
import java.util.UUID;

public class SendResult {
    private final UUID notificationId;
    private final boolean deduplicated;
    private final List<UUID> recipientIds;

    public SendResult(UUID notificationId, boolean deduplicated, List<UUID> recipientIds) {
        this.notificationId = notificationId;
        this.deduplicated = deduplicated;
        this.recipientIds = recipientIds;
    }

    public UUID getNotificationId() {
        return notificationId;
    }

    public boolean isDeduplicated() {
        return deduplicated;
    }

    public List<UUID> getRecipientIds() {
        return recipientIds;
    }
}
