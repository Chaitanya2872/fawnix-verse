package com.hirepath.integration.domain;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "calendar_oauth_states")
public class CalendarOAuthState {

    @Id
    @Column(length = 64)
    private String state;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CalendarProvider provider;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "return_url")
    private String returnUrl;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public CalendarOAuthState() {}

    public CalendarOAuthState(String state, CalendarProvider provider, String userId, String returnUrl) {
        this.state = state;
        this.provider = provider;
        this.userId = userId;
        this.returnUrl = returnUrl;
    }

    public String getState() {
        return state;
    }

    public CalendarProvider getProvider() {
        return provider;
    }

    public String getUserId() {
        return userId;
    }

    public String getReturnUrl() {
        return returnUrl;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
