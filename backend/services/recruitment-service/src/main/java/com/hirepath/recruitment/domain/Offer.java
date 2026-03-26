package com.hirepath.recruitment.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "offers")
public class Offer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "application_id")
    private CandidateApplication application;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "approval_flow_id")
    private String approvalFlowId;

    @Column(name = "approval_request_id")
    private String approvalRequestId;

    @Column(name = "base_salary")
    private BigDecimal baseSalary;

    private BigDecimal bonus;

    private String equity;

    private String benefits;

    @Column(name = "joining_date")
    private LocalDate joiningDate;

    @Column(name = "offer_expiry")
    private LocalDate offerExpiry;

    private String terms;

    @Enumerated(EnumType.STRING)
    private OfferStatus status = OfferStatus.DRAFT;

    @Column(name = "candidate_response")
    private String candidateResponse;

    @Column(name = "candidate_notes")
    private String candidateNotes;

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "offer")
    private List<OfferApproval> approvals;

    public UUID getId() {
        return id;
    }

    public CandidateApplication getApplication() {
        return application;
    }

    public void setApplication(CandidateApplication application) {
        this.application = application;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getApprovalFlowId() {
        return approvalFlowId;
    }

    public void setApprovalFlowId(String approvalFlowId) {
        this.approvalFlowId = approvalFlowId;
    }

    public String getApprovalRequestId() {
        return approvalRequestId;
    }

    public void setApprovalRequestId(String approvalRequestId) {
        this.approvalRequestId = approvalRequestId;
    }

    public BigDecimal getBaseSalary() {
        return baseSalary;
    }

    public void setBaseSalary(BigDecimal baseSalary) {
        this.baseSalary = baseSalary;
    }

    public BigDecimal getBonus() {
        return bonus;
    }

    public void setBonus(BigDecimal bonus) {
        this.bonus = bonus;
    }

    public String getEquity() {
        return equity;
    }

    public void setEquity(String equity) {
        this.equity = equity;
    }

    public String getBenefits() {
        return benefits;
    }

    public void setBenefits(String benefits) {
        this.benefits = benefits;
    }

    public LocalDate getJoiningDate() {
        return joiningDate;
    }

    public void setJoiningDate(LocalDate joiningDate) {
        this.joiningDate = joiningDate;
    }

    public LocalDate getOfferExpiry() {
        return offerExpiry;
    }

    public void setOfferExpiry(LocalDate offerExpiry) {
        this.offerExpiry = offerExpiry;
    }

    public String getTerms() {
        return terms;
    }

    public void setTerms(String terms) {
        this.terms = terms;
    }

    public OfferStatus getStatus() {
        return status;
    }

    public void setStatus(OfferStatus status) {
        this.status = status;
    }

    public String getCandidateResponse() {
        return candidateResponse;
    }

    public void setCandidateResponse(String candidateResponse) {
        this.candidateResponse = candidateResponse;
    }

    public String getCandidateNotes() {
        return candidateNotes;
    }

    public void setCandidateNotes(String candidateNotes) {
        this.candidateNotes = candidateNotes;
    }

    public OffsetDateTime getRespondedAt() {
        return respondedAt;
    }

    public void setRespondedAt(OffsetDateTime respondedAt) {
        this.respondedAt = respondedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public List<OfferApproval> getApprovals() {
        return approvals;
    }

    public void setApprovals(List<OfferApproval> approvals) {
        this.approvals = approvals;
    }
}
