package com.hirepath.recruitment.domain;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "candidate_applications")
public class CandidateApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "candidate_id")
    private Candidate candidate;

    @ManyToOne
    @JoinColumn(name = "position_id")
    private JobPosition position;

    @Enumerated(EnumType.STRING)
    private CandidateStatus status = CandidateStatus.APPLIED;

    @Column(name = "cover_letter")
    private String coverLetter;

    @Column(name = "salary_expectation")
    private BigDecimal salaryExpectation;

    @Column(name = "notice_period_days")
    private Integer noticePeriodDays;

    @Column(name = "consent_given")
    private boolean consentGiven;

    @CreationTimestamp
    @Column(name = "applied_at")
    private OffsetDateTime appliedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "rejection_notes")
    private String rejectionNotes;

    private String notes;

    @OneToMany(mappedBy = "application")
    private List<Interview> interviews;

    @OneToOne(mappedBy = "application")
    private Offer offer;

    @OneToOne(mappedBy = "application")
    private HRScreening screening;

    public UUID getId() {
        return id;
    }

    public Candidate getCandidate() {
        return candidate;
    }

    public void setCandidate(Candidate candidate) {
        this.candidate = candidate;
    }

    public JobPosition getPosition() {
        return position;
    }

    public void setPosition(JobPosition position) {
        this.position = position;
    }

    public CandidateStatus getStatus() {
        return status;
    }

    public void setStatus(CandidateStatus status) {
        this.status = status;
    }

    public String getCoverLetter() {
        return coverLetter;
    }

    public void setCoverLetter(String coverLetter) {
        this.coverLetter = coverLetter;
    }

    public BigDecimal getSalaryExpectation() {
        return salaryExpectation;
    }

    public void setSalaryExpectation(BigDecimal salaryExpectation) {
        this.salaryExpectation = salaryExpectation;
    }

    public Integer getNoticePeriodDays() {
        return noticePeriodDays;
    }

    public void setNoticePeriodDays(Integer noticePeriodDays) {
        this.noticePeriodDays = noticePeriodDays;
    }

    public boolean isConsentGiven() {
        return consentGiven;
    }

    public void setConsentGiven(boolean consentGiven) {
        this.consentGiven = consentGiven;
    }

    public OffsetDateTime getAppliedAt() {
        return appliedAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public String getRejectionNotes() {
        return rejectionNotes;
    }

    public void setRejectionNotes(String rejectionNotes) {
        this.rejectionNotes = rejectionNotes;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public List<Interview> getInterviews() {
        return interviews;
    }

    public void setInterviews(List<Interview> interviews) {
        this.interviews = interviews;
    }

    public Offer getOffer() {
        return offer;
    }

    public void setOffer(Offer offer) {
        this.offer = offer;
    }

    public HRScreening getScreening() {
        return screening;
    }

    public void setScreening(HRScreening screening) {
        this.screening = screening;
    }
}
