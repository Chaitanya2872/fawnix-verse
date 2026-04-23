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
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment extends AuditableEntity {

  @Id
  private UUID id;

  @Column(name = "payment_number", nullable = false, unique = true, length = 80)
  private String paymentNumber;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "invoice_id", nullable = false)
  private Invoice invoice;

  @Column(name = "requested_by", nullable = false)
  private UUID requestedBy;

  @Column(name = "approved_by")
  private UUID approvedBy;

  @Column(name = "payment_date")
  private LocalDate paymentDate;

  @Column(name = "amount", nullable = false, precision = 14, scale = 2)
  private BigDecimal amount;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 40)
  private PaymentStatus status;

  @Column(name = "remarks")
  private String remarks;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getPaymentNumber() {
    return paymentNumber;
  }

  public void setPaymentNumber(String paymentNumber) {
    this.paymentNumber = paymentNumber;
  }

  public Invoice getInvoice() {
    return invoice;
  }

  public void setInvoice(Invoice invoice) {
    this.invoice = invoice;
  }

  public UUID getRequestedBy() {
    return requestedBy;
  }

  public void setRequestedBy(UUID requestedBy) {
    this.requestedBy = requestedBy;
  }

  public UUID getApprovedBy() {
    return approvedBy;
  }

  public void setApprovedBy(UUID approvedBy) {
    this.approvedBy = approvedBy;
  }

  public LocalDate getPaymentDate() {
    return paymentDate;
  }

  public void setPaymentDate(LocalDate paymentDate) {
    this.paymentDate = paymentDate;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public void setAmount(BigDecimal amount) {
    this.amount = amount;
  }

  public PaymentStatus getStatus() {
    return status;
  }

  public void setStatus(PaymentStatus status) {
    this.status = status;
  }

  public String getRemarks() {
    return remarks;
  }

  public void setRemarks(String remarks) {
    this.remarks = remarks;
  }
}
