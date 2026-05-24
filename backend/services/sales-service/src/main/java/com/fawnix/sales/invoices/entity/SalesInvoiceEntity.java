package com.fawnix.sales.invoices.entity;

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
@Table(name = "sales_invoices")
public class SalesInvoiceEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "invoice_number", length = 32, nullable = false, unique = true)
  private String invoiceNumber;

  @Column(name = "sales_order_id", length = 36, nullable = false)
  private String salesOrderId;

  @Column(name = "sales_order_number", length = 32, nullable = false)
  private String salesOrderNumber;

  @Column(name = "customer_name", length = 160, nullable = false)
  private String customerName;

  @Column(name = "company", length = 160)
  private String company;

  @Column(name = "billing_address", columnDefinition = "text")
  private String billingAddress;

  @Column(name = "currency", length = 10, nullable = false)
  private String currency;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", length = 40, nullable = false)
  private SalesInvoiceStatus status;

  @Column(name = "due_date")
  private LocalDate dueDate;

  @Column(name = "issued_at")
  private Instant issuedAt;

  @Column(name = "paid_at")
  private Instant paidAt;

  @Column(name = "subtotal", precision = 14, scale = 2, nullable = false)
  private BigDecimal subtotal = BigDecimal.ZERO;

  @Column(name = "tax_total", precision = 14, scale = 2, nullable = false)
  private BigDecimal taxTotal = BigDecimal.ZERO;

  @Column(name = "total", precision = 14, scale = 2, nullable = false)
  private BigDecimal total = BigDecimal.ZERO;

  @Column(name = "balance_due", precision = 14, scale = 2, nullable = false)
  private BigDecimal balanceDue = BigDecimal.ZERO;

  @Column(name = "notes", columnDefinition = "text")
  private String notes;

  @Column(name = "created_by_user_id", length = 36)
  private String createdByUserId;

  @Column(name = "created_by_name", length = 120)
  private String createdByName;

  @Column(name = "updated_by_user_id", length = 36)
  private String updatedByUserId;

  @Column(name = "updated_by_name", length = 120)
  private String updatedByName;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getInvoiceNumber() { return invoiceNumber; }
  public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }
  public String getSalesOrderId() { return salesOrderId; }
  public void setSalesOrderId(String salesOrderId) { this.salesOrderId = salesOrderId; }
  public String getSalesOrderNumber() { return salesOrderNumber; }
  public void setSalesOrderNumber(String salesOrderNumber) { this.salesOrderNumber = salesOrderNumber; }
  public String getCustomerName() { return customerName; }
  public void setCustomerName(String customerName) { this.customerName = customerName; }
  public String getCompany() { return company; }
  public void setCompany(String company) { this.company = company; }
  public String getBillingAddress() { return billingAddress; }
  public void setBillingAddress(String billingAddress) { this.billingAddress = billingAddress; }
  public String getCurrency() { return currency; }
  public void setCurrency(String currency) { this.currency = currency; }
  public SalesInvoiceStatus getStatus() { return status; }
  public void setStatus(SalesInvoiceStatus status) { this.status = status; }
  public LocalDate getDueDate() { return dueDate; }
  public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
  public Instant getIssuedAt() { return issuedAt; }
  public void setIssuedAt(Instant issuedAt) { this.issuedAt = issuedAt; }
  public Instant getPaidAt() { return paidAt; }
  public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }
  public BigDecimal getSubtotal() { return subtotal; }
  public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
  public BigDecimal getTaxTotal() { return taxTotal; }
  public void setTaxTotal(BigDecimal taxTotal) { this.taxTotal = taxTotal; }
  public BigDecimal getTotal() { return total; }
  public void setTotal(BigDecimal total) { this.total = total; }
  public BigDecimal getBalanceDue() { return balanceDue; }
  public void setBalanceDue(BigDecimal balanceDue) { this.balanceDue = balanceDue; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public String getCreatedByUserId() { return createdByUserId; }
  public void setCreatedByUserId(String createdByUserId) { this.createdByUserId = createdByUserId; }
  public String getCreatedByName() { return createdByName; }
  public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }
  public String getUpdatedByUserId() { return updatedByUserId; }
  public void setUpdatedByUserId(String updatedByUserId) { this.updatedByUserId = updatedByUserId; }
  public String getUpdatedByName() { return updatedByName; }
  public void setUpdatedByName(String updatedByName) { this.updatedByName = updatedByName; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
