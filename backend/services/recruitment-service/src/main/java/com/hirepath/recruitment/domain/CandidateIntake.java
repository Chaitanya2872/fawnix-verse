package com.hirepath.recruitment.domain;

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
@Table(name = "candidate_intake")
public class CandidateIntake {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "vacancy_id", nullable = false)
    private UUID vacancyId;

    @Column(name = "form_submission_id")
    private UUID formSubmissionId;

    @Column(name = "form_id")
    private String formId;

    @Column(name = "candidate_name")
    private String candidateName;

    private String email;
    private String phone;

    @Column(name = "resume_url")
    private String resumeUrl;

    private String source;

    @Enumerated(EnumType.STRING)
    private IntakeStatus status = IntakeStatus.NEW;

    @Column(name = "reviewer_id")
    private String reviewerId;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "dedupe_hash")
    private String dedupeHash;

    @Column(name = "duplicate_of_intake_id")
    private UUID duplicateOfIntakeId;

    public UUID getId() {
        return id;
    }

    public UUID getVacancyId() {
        return vacancyId;
    }

    public void setVacancyId(UUID vacancyId) {
        this.vacancyId = vacancyId;
    }

    public UUID getFormSubmissionId() {
        return formSubmissionId;
    }

    public void setFormSubmissionId(UUID formSubmissionId) {
        this.formSubmissionId = formSubmissionId;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getResumeUrl() {
        return resumeUrl;
    }

    public void setResumeUrl(String resumeUrl) {
        this.resumeUrl = resumeUrl;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public IntakeStatus getStatus() {
        return status;
    }

    public void setStatus(IntakeStatus status) {
        this.status = status;
    }

    public String getReviewerId() {
        return reviewerId;
    }

    public void setReviewerId(String reviewerId) {
        this.reviewerId = reviewerId;
    }

    public OffsetDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(OffsetDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public String getDedupeHash() {
        return dedupeHash;
    }

    public void setDedupeHash(String dedupeHash) {
        this.dedupeHash = dedupeHash;
    }

    public UUID getDuplicateOfIntakeId() {
        return duplicateOfIntakeId;
    }

    public void setDuplicateOfIntakeId(UUID duplicateOfIntakeId) {
        this.duplicateOfIntakeId = duplicateOfIntakeId;
    }
}
