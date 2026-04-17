package com.fawnix.procurement.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "approval_steps")
public class ApprovalStep extends AuditableEntity {

  @Id
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "workflow_id", nullable = false)
  private ApprovalWorkflow workflow;

  @Column(name = "step_order", nullable = false)
  private Integer stepOrder;

  @Column(name = "approver_role", length = 80)
  private String approverRole;

  @Column(name = "approver_user_id")
  private UUID approverUserId;

  @Column(name = "min_amount", precision = 14, scale = 2)
  private BigDecimal minAmount;

  @Column(name = "max_amount", precision = 14, scale = 2)
  private BigDecimal maxAmount;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public ApprovalWorkflow getWorkflow() {
    return workflow;
  }

  public void setWorkflow(ApprovalWorkflow workflow) {
    this.workflow = workflow;
  }

  public Integer getStepOrder() {
    return stepOrder;
  }

  public void setStepOrder(Integer stepOrder) {
    this.stepOrder = stepOrder;
  }

  public String getApproverRole() {
    return approverRole;
  }

  public void setApproverRole(String approverRole) {
    this.approverRole = approverRole;
  }

  public UUID getApproverUserId() {
    return approverUserId;
  }

  public void setApproverUserId(UUID approverUserId) {
    this.approverUserId = approverUserId;
  }

  public BigDecimal getMinAmount() {
    return minAmount;
  }

  public void setMinAmount(BigDecimal minAmount) {
    this.minAmount = minAmount;
  }

  public BigDecimal getMaxAmount() {
    return maxAmount;
  }

  public void setMaxAmount(BigDecimal maxAmount) {
    this.maxAmount = maxAmount;
  }
}
