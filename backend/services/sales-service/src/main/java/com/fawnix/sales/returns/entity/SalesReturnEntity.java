package com.fawnix.sales.returns.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "sales_returns")
public class SalesReturnEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "return_number", length = 32, nullable = false, unique = true)
  private String returnNumber;

  @Column(name = "sales_order_id", length = 36, nullable = false)
  private String salesOrderId;

  @Column(name = "sales_invoice_id", length = 36)
  private String salesInvoiceId;

  @Column(name = "customer_name", length = 160, nullable = false)
  private String customerName;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", length = 40, nullable = false)
  private SalesReturnStatus status;

  @Column(name = "return_reason", columnDefinition = "text")
  private String returnReason;

  @Column(name = "requested_amount", precision = 14, scale = 2, nullable = false)
  private BigDecimal requestedAmount = BigDecimal.ZERO;

  @Column(name = "approved_amount", precision = 14, scale = 2, nullable = false)
  private BigDecimal approvedAmount = BigDecimal.ZERO;

  @Column(name = "remarks", columnDefinition = "text")
  private String remarks;

  @Column(name = "created_by_user_id", length = 36)
  private String createdByUserId;

  @Column(name = "created_by_name", length = 120)
  private String createdByName;

  @Column(name = "approved_by_name", length = 120)
  private String approvedByName;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "approved_at")
  private Instant approvedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getReturnNumber() { return returnNumber; }
  public void setReturnNumber(String returnNumber) { this.returnNumber = returnNumber; }
  public String getSalesOrderId() { return salesOrderId; }
  public void setSalesOrderId(String salesOrderId) { this.salesOrderId = salesOrderId; }
  public String getSalesInvoiceId() { return salesInvoiceId; }
  public void setSalesInvoiceId(String salesInvoiceId) { this.salesInvoiceId = salesInvoiceId; }
  public String getCustomerName() { return customerName; }
  public void setCustomerName(String customerName) { this.customerName = customerName; }
  public SalesReturnStatus getStatus() { return status; }
  public void setStatus(SalesReturnStatus status) { this.status = status; }
  public String getReturnReason() { return returnReason; }
  public void setReturnReason(String returnReason) { this.returnReason = returnReason; }
  public BigDecimal getRequestedAmount() { return requestedAmount; }
  public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }
  public BigDecimal getApprovedAmount() { return approvedAmount; }
  public void setApprovedAmount(BigDecimal approvedAmount) { this.approvedAmount = approvedAmount; }
  public String getRemarks() { return remarks; }
  public void setRemarks(String remarks) { this.remarks = remarks; }
  public String getCreatedByUserId() { return createdByUserId; }
  public void setCreatedByUserId(String createdByUserId) { this.createdByUserId = createdByUserId; }
  public String getCreatedByName() { return createdByName; }
  public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }
  public String getApprovedByName() { return approvedByName; }
  public void setApprovedByName(String approvedByName) { this.approvedByName = approvedByName; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getApprovedAt() { return approvedAt; }
  public void setApprovedAt(Instant approvedAt) { this.approvedAt = approvedAt; }
}
