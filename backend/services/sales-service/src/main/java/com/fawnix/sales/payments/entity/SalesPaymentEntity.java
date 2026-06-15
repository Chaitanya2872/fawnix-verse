package com.fawnix.sales.payments.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "sales_payments")
public class SalesPaymentEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "payment_number", length = 32, nullable = false, unique = true)
  private String paymentNumber;

  @Column(name = "sales_invoice_id", length = 36, nullable = false)
  private String salesInvoiceId;

  @Column(name = "sales_order_id", length = 36, nullable = false)
  private String salesOrderId;

  @Column(name = "customer_name", length = 160, nullable = false)
  private String customerName;

  @Column(name = "currency", length = 10, nullable = false)
  private String currency;

  @Enumerated(EnumType.STRING)
  @Column(name = "payment_mode", length = 40, nullable = false)
  private PaymentMode paymentMode;

  @Column(name = "payment_date", nullable = false)
  private LocalDate paymentDate;

  @Column(name = "amount", precision = 14, scale = 2, nullable = false)
  private BigDecimal amount = BigDecimal.ZERO;

  @Column(name = "reference_number", length = 120)
  private String referenceNumber;

  @Column(name = "remarks", columnDefinition = "text")
  private String remarks;

  @Column(name = "created_by_user_id", length = 36)
  private String createdByUserId;

  @Column(name = "created_by_name", length = 120)
  private String createdByName;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getPaymentNumber() { return paymentNumber; }
  public void setPaymentNumber(String paymentNumber) { this.paymentNumber = paymentNumber; }
  public String getSalesInvoiceId() { return salesInvoiceId; }
  public void setSalesInvoiceId(String salesInvoiceId) { this.salesInvoiceId = salesInvoiceId; }
  public String getSalesOrderId() { return salesOrderId; }
  public void setSalesOrderId(String salesOrderId) { this.salesOrderId = salesOrderId; }
  public String getCustomerName() { return customerName; }
  public void setCustomerName(String customerName) { this.customerName = customerName; }
  public String getCurrency() { return currency; }
  public void setCurrency(String currency) { this.currency = currency; }
  public PaymentMode getPaymentMode() { return paymentMode; }
  public void setPaymentMode(PaymentMode paymentMode) { this.paymentMode = paymentMode; }
  public LocalDate getPaymentDate() { return paymentDate; }
  public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public String getReferenceNumber() { return referenceNumber; }
  public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }
  public String getRemarks() { return remarks; }
  public void setRemarks(String remarks) { this.remarks = remarks; }
  public String getCreatedByUserId() { return createdByUserId; }
  public void setCreatedByUserId(String createdByUserId) { this.createdByUserId = createdByUserId; }
  public String getCreatedByName() { return createdByName; }
  public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
