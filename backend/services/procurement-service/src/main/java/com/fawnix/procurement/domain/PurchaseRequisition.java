package com.fawnix.procurement.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "purchase_requisitions")
public class PurchaseRequisition extends AuditableEntity {

  @Id
  private UUID id;

  @Column(name = "pr_number", nullable = false, unique = true, length = 40)
  private String prNumber;

  @Column(name = "requester_id", nullable = false)
  private UUID requesterId;

  @Column(name = "department", nullable = false, length = 120)
  private String department;

  @Column(name = "purpose", columnDefinition = "text")
  private String purpose;

  @Column(name = "needed_by_date")
  private LocalDate neededByDate;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 40)
  private PurchaseRequisitionStatus status;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "workflow_id")
  private ApprovalWorkflow workflow;

  @Column(name = "current_step_order")
  private Integer currentStepOrder;

  @Column(name = "submitted_at")
  private Instant submittedAt;

  @Column(name = "approved_at")
  private Instant approvedAt;

  @Column(name = "rejected_at")
  private Instant rejectedAt;

  @Column(name = "rejection_reason", columnDefinition = "text")
  private String rejectionReason;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getPrNumber() {
    return prNumber;
  }

  public void setPrNumber(String prNumber) {
    this.prNumber = prNumber;
  }

  public UUID getRequesterId() {
    return requesterId;
  }

  public void setRequesterId(UUID requesterId) {
    this.requesterId = requesterId;
  }

  public String getDepartment() {
    return department;
  }

  public void setDepartment(String department) {
    this.department = department;
  }

  public String getPurpose() {
    return purpose;
  }

  public void setPurpose(String purpose) {
    this.purpose = purpose;
  }

  public LocalDate getNeededByDate() {
    return neededByDate;
  }

  public void setNeededByDate(LocalDate neededByDate) {
    this.neededByDate = neededByDate;
  }

  public PurchaseRequisitionStatus getStatus() {
    return status;
  }

  public void setStatus(PurchaseRequisitionStatus status) {
    this.status = status;
  }

  public ApprovalWorkflow getWorkflow() {
    return workflow;
  }

  public void setWorkflow(ApprovalWorkflow workflow) {
    this.workflow = workflow;
  }

  public Integer getCurrentStepOrder() {
    return currentStepOrder;
  }

  public void setCurrentStepOrder(Integer currentStepOrder) {
    this.currentStepOrder = currentStepOrder;
  }

  public Instant getSubmittedAt() {
    return submittedAt;
  }

  public void setSubmittedAt(Instant submittedAt) {
    this.submittedAt = submittedAt;
  }

  public Instant getApprovedAt() {
    return approvedAt;
  }

  public void setApprovedAt(Instant approvedAt) {
    this.approvedAt = approvedAt;
  }

  public Instant getRejectedAt() {
    return rejectedAt;
  }

  public void setRejectedAt(Instant rejectedAt) {
    this.rejectedAt = rejectedAt;
  }

  public String getRejectionReason() {
    return rejectionReason;
  }

  public void setRejectionReason(String rejectionReason) {
    this.rejectionReason = rejectionReason;
  }
}
