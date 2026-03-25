package com.hirepath.forms.domain;

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
import jakarta.persistence.Table;

@Entity
@Table(name = "application_form_links")
public class ApplicationFormLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "form_id", nullable = false)
    private String formId;

    @Column(name = "candidate_name", nullable = false)
    private String candidateName;

    @Column(name = "candidate_email", nullable = false)
    private String candidateEmail;

    private String module;

    @Enumerated(EnumType.STRING)
    private FormLinkStatus status = FormLinkStatus.ACTIVE;

    @Column(nullable = false)
    private String url;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "last_sent_at")
    private OffsetDateTime lastSentAt;

    public UUID getId() {
        return id;
    }

    public String getFormId() {
        return formId;
    }

    public void setFormId(String formId) {
        this.formId = formId;
    }

    public String getCandidateName() {
        return candidateName;
    }

    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }

    public String getCandidateEmail() {
        return candidateEmail;
    }

    public void setCandidateEmail(String candidateEmail) {
        this.candidateEmail = candidateEmail;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public FormLinkStatus getStatus() {
        return status;
    }

    public void setStatus(FormLinkStatus status) {
        this.status = status;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getLastSentAt() {
        return lastSentAt;
    }

    public void setLastSentAt(OffsetDateTime lastSentAt) {
        this.lastSentAt = lastSentAt;
    }
}
