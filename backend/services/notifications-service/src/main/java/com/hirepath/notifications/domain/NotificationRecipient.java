package com.hirepath.notifications.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "notification_recipients")
public class NotificationRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "notification_id")
    private Notification notification;

    @Column(name = "user_id")
    private UUID userId;

    private String email;

    @Column(name = "channels", nullable = false)
    private String channels;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationRecipientStatus status = NotificationRecipientStatus.PENDING;

    @Column(name = "read_at")
    private OffsetDateTime readAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Notification getNotification() {
        return notification;
    }

    public void setNotification(Notification notification) {
        this.notification = notification;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getChannels() {
        return channels;
    }

    public void setChannels(String channels) {
        this.channels = channels;
    }

    public NotificationRecipientStatus getStatus() {
        return status;
    }

    public void setStatus(NotificationRecipientStatus status) {
        this.status = status;
    }

    public OffsetDateTime getReadAt() {
        return readAt;
    }

    public void setReadAt(OffsetDateTime readAt) {
        this.readAt = readAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
