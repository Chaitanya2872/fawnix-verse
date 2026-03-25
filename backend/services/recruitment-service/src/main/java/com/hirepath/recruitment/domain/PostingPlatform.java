package com.hirepath.recruitment.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

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
@Table(name = "posting_platforms")
public class PostingPlatform {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "posting_id")
    private JobPosting posting;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PortalPlatform platform;

    @Enumerated(EnumType.STRING)
    private PostingPlatformStatus status = PostingPlatformStatus.PENDING;

    @Column(name = "external_id")
    private String externalId;

    @Column(name = "external_url")
    private String externalUrl;

    @Column(name = "posted_at")
    private OffsetDateTime postedAt;

    @Column(name = "error_message")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public UUID getId() {
        return id;
    }

    public JobPosting getPosting() {
        return posting;
    }

    public void setPosting(JobPosting posting) {
        this.posting = posting;
    }

    public PortalPlatform getPlatform() {
        return platform;
    }

    public void setPlatform(PortalPlatform platform) {
        this.platform = platform;
    }

    public PostingPlatformStatus getStatus() {
        return status;
    }

    public void setStatus(PostingPlatformStatus status) {
        this.status = status;
    }

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public String getExternalUrl() {
        return externalUrl;
    }

    public void setExternalUrl(String externalUrl) {
        this.externalUrl = externalUrl;
    }

    public OffsetDateTime getPostedAt() {
        return postedAt;
    }

    public void setPostedAt(OffsetDateTime postedAt) {
        this.postedAt = postedAt;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
