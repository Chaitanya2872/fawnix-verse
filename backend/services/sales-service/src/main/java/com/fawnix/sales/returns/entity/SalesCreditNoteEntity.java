package com.fawnix.sales.returns.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "sales_credit_notes")
public class SalesCreditNoteEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "credit_note_number", length = 32, nullable = false, unique = true)
  private String creditNoteNumber;

  @Column(name = "sales_return_id", length = 36, nullable = false)
  private String salesReturnId;

  @Column(name = "sales_invoice_id", length = 36)
  private String salesInvoiceId;

  @Column(name = "customer_name", length = 160, nullable = false)
  private String customerName;

  @Column(name = "currency", length = 10, nullable = false)
  private String currency;

  @Column(name = "amount", precision = 14, scale = 2, nullable = false)
  private BigDecimal amount = BigDecimal.ZERO;

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
  public String getCreditNoteNumber() { return creditNoteNumber; }
  public void setCreditNoteNumber(String creditNoteNumber) { this.creditNoteNumber = creditNoteNumber; }
  public String getSalesReturnId() { return salesReturnId; }
  public void setSalesReturnId(String salesReturnId) { this.salesReturnId = salesReturnId; }
  public String getSalesInvoiceId() { return salesInvoiceId; }
  public void setSalesInvoiceId(String salesInvoiceId) { this.salesInvoiceId = salesInvoiceId; }
  public String getCustomerName() { return customerName; }
  public void setCustomerName(String customerName) { this.customerName = customerName; }
  public String getCurrency() { return currency; }
  public void setCurrency(String currency) { this.currency = currency; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public String getRemarks() { return remarks; }
  public void setRemarks(String remarks) { this.remarks = remarks; }
  public String getCreatedByUserId() { return createdByUserId; }
  public void setCreatedByUserId(String createdByUserId) { this.createdByUserId = createdByUserId; }
  public String getCreatedByName() { return createdByName; }
  public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
