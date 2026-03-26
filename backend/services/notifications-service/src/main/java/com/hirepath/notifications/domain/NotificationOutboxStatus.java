package com.hirepath.notifications.domain;

public enum NotificationOutboxStatus {
    PENDING,
    PROCESSING,
    SENT,
    FAILED,
    DEAD
}
