package com.hirepath.recruitment.domain;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "application_form_submissions")
public class ApplicationFormSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "form_id", nullable = false)
    private String formId;

    @Column(name = "form_name")
    private String formName;

    @ManyToOne
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @ManyToOne
    @JoinColumn(name = "application_id", nullable = false)
    private CandidateApplication application;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> answers;

    @Column(name = "resume_url")
    private String resumeUrl;

    @CreationTimestamp
    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    private String source;

    public UUID getId() {
        return id;
    }

    public String getFormId() {
        return formId;
    }

    public void setFormId(String formId) {
        this.formId = formId;
    }

    public String getFormName() {
        return formName;
    }

    public void setFormName(String formName) {
        this.formName = formName;
    }

    public Candidate getCandidate() {
        return candidate;
    }

    public void setCandidate(Candidate candidate) {
        this.candidate = candidate;
    }

    public CandidateApplication getApplication() {
        return application;
    }

    public void setApplication(CandidateApplication application) {
        this.application = application;
    }

    public Map<String, Object> getAnswers() {
        return answers;
    }

    public void setAnswers(Map<String, Object> answers) {
        this.answers = answers;
    }

    public String getResumeUrl() {
        return resumeUrl;
    }

    public void setResumeUrl(String resumeUrl) {
        this.resumeUrl = resumeUrl;
    }

    public OffsetDateTime getSubmittedAt() {
        return submittedAt;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }
}
