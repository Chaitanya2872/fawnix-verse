package com.fawnix.sales.orders.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "sales_order_approvals")
public class SalesOrderApprovalEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "sales_order_id", length = 36, nullable = false)
  private String salesOrderId;

  @Column(name = "role_key", length = 80, nullable = false)
  private String roleKey;

  @Column(name = "role_label", length = 120, nullable = false)
  private String roleLabel;

  @Column(name = "sequence_no", nullable = false)
  private int sequenceNo;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", length = 40, nullable = false)
  private ApprovalDecisionStatus status;

  @Column(name = "remarks", columnDefinition = "text")
  private String remarks;

  @Column(name = "approver_user_id", length = 36)
  private String approverUserId;

  @Column(name = "approver_name", length = 120)
  private String approverName;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "decided_at")
  private Instant decidedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getSalesOrderId() { return salesOrderId; }
  public void setSalesOrderId(String salesOrderId) { this.salesOrderId = salesOrderId; }
  public String getRoleKey() { return roleKey; }
  public void setRoleKey(String roleKey) { this.roleKey = roleKey; }
  public String getRoleLabel() { return roleLabel; }
  public void setRoleLabel(String roleLabel) { this.roleLabel = roleLabel; }
  public int getSequenceNo() { return sequenceNo; }
  public void setSequenceNo(int sequenceNo) { this.sequenceNo = sequenceNo; }
  public ApprovalDecisionStatus getStatus() { return status; }
  public void setStatus(ApprovalDecisionStatus status) { this.status = status; }
  public String getRemarks() { return remarks; }
  public void setRemarks(String remarks) { this.remarks = remarks; }
  public String getApproverUserId() { return approverUserId; }
  public void setApproverUserId(String approverUserId) { this.approverUserId = approverUserId; }
  public String getApproverName() { return approverName; }
  public void setApproverName(String approverName) { this.approverName = approverName; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getDecidedAt() { return decidedAt; }
  public void setDecidedAt(Instant decidedAt) { this.decidedAt = decidedAt; }
}
