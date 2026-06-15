package com.fawnix.sales.orders.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sales_orders")
public class SalesOrderEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "order_number", length = 32, nullable = false, unique = true)
  private String orderNumber;

  @Column(name = "quote_id", length = 36)
  private String quoteId;

  @Column(name = "lead_id", length = 36)
  private String leadId;

  @Column(name = "customer_name", length = 160, nullable = false)
  private String customerName;

  @Column(name = "company", length = 160)
  private String company;

  @Column(name = "email", length = 160)
  private String email;

  @Column(name = "phone", length = 50)
  private String phone;

  @Column(name = "billing_address", columnDefinition = "text")
  private String billingAddress;

  @Column(name = "shipping_address", columnDefinition = "text")
  private String shippingAddress;

  @Column(name = "currency", length = 10, nullable = false)
  private String currency;

  @Column(name = "delivery_date")
  private LocalDate deliveryDate;

  @Column(name = "payment_terms", length = 120)
  private String paymentTerms;

  @Column(name = "customer_po_number", length = 120)
  private String customerPoNumber;

  @Column(name = "quotation_reference", length = 120)
  private String quotationReference;

  @Column(name = "payment_due_days")
  private Integer paymentDueDays;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", length = 40, nullable = false)
  private SalesOrderStatus status;

  @Column(name = "subtotal", precision = 14, scale = 2, nullable = false)
  private BigDecimal subtotal = BigDecimal.ZERO;

  @Column(name = "tax_rate", precision = 5, scale = 2)
  private BigDecimal taxRate = BigDecimal.ZERO;

  @Column(name = "tax_total", precision = 14, scale = 2, nullable = false)
  private BigDecimal taxTotal = BigDecimal.ZERO;

  @Column(name = "discount_percent", precision = 5, scale = 2, nullable = false)
  private BigDecimal discountPercent = BigDecimal.ZERO;

  @Column(name = "discount_amount", precision = 14, scale = 2, nullable = false)
  private BigDecimal discountAmount = BigDecimal.ZERO;

  @Column(name = "total", precision = 14, scale = 2, nullable = false)
  private BigDecimal total = BigDecimal.ZERO;

  @Column(name = "customer_credit_limit", precision = 14, scale = 2, nullable = false)
  private BigDecimal customerCreditLimit = BigDecimal.ZERO;

  @Column(name = "customer_outstanding_amount", precision = 14, scale = 2, nullable = false)
  private BigDecimal customerOutstandingAmount = BigDecimal.ZERO;

  @Column(name = "credit_limit_exceeded", nullable = false)
  private boolean creditLimitExceeded;

  @Column(name = "stock_available", nullable = false)
  private boolean stockAvailable;

  @Column(name = "duplicate_order_flag", nullable = false)
  private boolean duplicateOrderFlag;

  @Column(name = "risky_payment_terms", nullable = false)
  private boolean riskyPaymentTerms;

  @Column(name = "special_discount_flag", nullable = false)
  private boolean specialDiscountFlag;

  @Column(name = "validation_summary", columnDefinition = "text")
  private String validationSummary;

  @Column(name = "approval_snapshot", columnDefinition = "text")
  private String approvalSnapshot;

  @Column(name = "notes", columnDefinition = "text")
  private String notes;

  @Column(name = "inventory_reserved", nullable = false)
  private boolean inventoryReserved;

  @Column(name = "inventory_reservation_message", columnDefinition = "text")
  private String inventoryReservationMessage;

  @Column(name = "inventory_reserved_at")
  private Instant inventoryReservedAt;

  @Column(name = "submitted_at")
  private Instant submittedAt;

  @Column(name = "confirmed_at")
  private Instant confirmedAt;

  @Column(name = "confirmed_by_name", length = 120)
  private String confirmedByName;

  @Column(name = "last_validated_at")
  private Instant lastValidatedAt;

  @Column(name = "confirmation_attachment_url", columnDefinition = "text")
  private String confirmationAttachmentUrl;

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

  @OneToMany(mappedBy = "salesOrder", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("position ASC")
  private List<SalesOrderItemEntity> items = new ArrayList<>();

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getOrderNumber() {
    return orderNumber;
  }

  public void setOrderNumber(String orderNumber) {
    this.orderNumber = orderNumber;
  }

  public String getQuoteId() {
    return quoteId;
  }

  public void setQuoteId(String quoteId) {
    this.quoteId = quoteId;
  }

  public String getLeadId() {
    return leadId;
  }

  public void setLeadId(String leadId) {
    this.leadId = leadId;
  }

  public String getCustomerName() {
    return customerName;
  }

  public void setCustomerName(String customerName) {
    this.customerName = customerName;
  }

  public String getCompany() {
    return company;
  }

  public void setCompany(String company) {
    this.company = company;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getBillingAddress() {
    return billingAddress;
  }

  public void setBillingAddress(String billingAddress) {
    this.billingAddress = billingAddress;
  }

  public String getShippingAddress() {
    return shippingAddress;
  }

  public void setShippingAddress(String shippingAddress) {
    this.shippingAddress = shippingAddress;
  }

  public String getCurrency() {
    return currency;
  }

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public LocalDate getDeliveryDate() {
    return deliveryDate;
  }

  public void setDeliveryDate(LocalDate deliveryDate) {
    this.deliveryDate = deliveryDate;
  }

  public String getPaymentTerms() {
    return paymentTerms;
  }

  public void setPaymentTerms(String paymentTerms) {
    this.paymentTerms = paymentTerms;
  }

  public String getCustomerPoNumber() {
    return customerPoNumber;
  }

  public void setCustomerPoNumber(String customerPoNumber) {
    this.customerPoNumber = customerPoNumber;
  }

  public String getQuotationReference() {
    return quotationReference;
  }

  public void setQuotationReference(String quotationReference) {
    this.quotationReference = quotationReference;
  }

  public Integer getPaymentDueDays() {
    return paymentDueDays;
  }

  public void setPaymentDueDays(Integer paymentDueDays) {
    this.paymentDueDays = paymentDueDays;
  }

  public SalesOrderStatus getStatus() {
    return status;
  }

  public void setStatus(SalesOrderStatus status) {
    this.status = status;
  }

  public BigDecimal getSubtotal() {
    return subtotal;
  }

  public void setSubtotal(BigDecimal subtotal) {
    this.subtotal = subtotal;
  }

  public BigDecimal getTaxRate() {
    return taxRate;
  }

  public void setTaxRate(BigDecimal taxRate) {
    this.taxRate = taxRate;
  }

  public BigDecimal getTaxTotal() {
    return taxTotal;
  }

  public void setTaxTotal(BigDecimal taxTotal) {
    this.taxTotal = taxTotal;
  }

  public BigDecimal getDiscountPercent() {
    return discountPercent;
  }

  public void setDiscountPercent(BigDecimal discountPercent) {
    this.discountPercent = discountPercent;
  }

  public BigDecimal getDiscountAmount() {
    return discountAmount;
  }

  public void setDiscountAmount(BigDecimal discountAmount) {
    this.discountAmount = discountAmount;
  }

  public BigDecimal getTotal() {
    return total;
  }

  public void setTotal(BigDecimal total) {
    this.total = total;
  }

  public BigDecimal getCustomerCreditLimit() {
    return customerCreditLimit;
  }

  public void setCustomerCreditLimit(BigDecimal customerCreditLimit) {
    this.customerCreditLimit = customerCreditLimit;
  }

  public BigDecimal getCustomerOutstandingAmount() {
    return customerOutstandingAmount;
  }

  public void setCustomerOutstandingAmount(BigDecimal customerOutstandingAmount) {
    this.customerOutstandingAmount = customerOutstandingAmount;
  }

  public boolean isCreditLimitExceeded() {
    return creditLimitExceeded;
  }

  public void setCreditLimitExceeded(boolean creditLimitExceeded) {
    this.creditLimitExceeded = creditLimitExceeded;
  }

  public boolean isStockAvailable() {
    return stockAvailable;
  }

  public void setStockAvailable(boolean stockAvailable) {
    this.stockAvailable = stockAvailable;
  }

  public boolean isDuplicateOrderFlag() {
    return duplicateOrderFlag;
  }

  public void setDuplicateOrderFlag(boolean duplicateOrderFlag) {
    this.duplicateOrderFlag = duplicateOrderFlag;
  }

  public boolean isRiskyPaymentTerms() {
    return riskyPaymentTerms;
  }

  public void setRiskyPaymentTerms(boolean riskyPaymentTerms) {
    this.riskyPaymentTerms = riskyPaymentTerms;
  }

  public boolean isSpecialDiscountFlag() {
    return specialDiscountFlag;
  }

  public void setSpecialDiscountFlag(boolean specialDiscountFlag) {
    this.specialDiscountFlag = specialDiscountFlag;
  }

  public String getValidationSummary() {
    return validationSummary;
  }

  public void setValidationSummary(String validationSummary) {
    this.validationSummary = validationSummary;
  }

  public String getApprovalSnapshot() {
    return approvalSnapshot;
  }

  public void setApprovalSnapshot(String approvalSnapshot) {
    this.approvalSnapshot = approvalSnapshot;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public boolean isInventoryReserved() {
    return inventoryReserved;
  }

  public void setInventoryReserved(boolean inventoryReserved) {
    this.inventoryReserved = inventoryReserved;
  }

  public String getInventoryReservationMessage() {
    return inventoryReservationMessage;
  }

  public void setInventoryReservationMessage(String inventoryReservationMessage) {
    this.inventoryReservationMessage = inventoryReservationMessage;
  }

  public Instant getInventoryReservedAt() {
    return inventoryReservedAt;
  }

  public void setInventoryReservedAt(Instant inventoryReservedAt) {
    this.inventoryReservedAt = inventoryReservedAt;
  }

  public Instant getSubmittedAt() {
    return submittedAt;
  }

  public void setSubmittedAt(Instant submittedAt) {
    this.submittedAt = submittedAt;
  }

  public Instant getConfirmedAt() {
    return confirmedAt;
  }

  public void setConfirmedAt(Instant confirmedAt) {
    this.confirmedAt = confirmedAt;
  }

  public String getConfirmedByName() {
    return confirmedByName;
  }

  public void setConfirmedByName(String confirmedByName) {
    this.confirmedByName = confirmedByName;
  }

  public Instant getLastValidatedAt() {
    return lastValidatedAt;
  }

  public void setLastValidatedAt(Instant lastValidatedAt) {
    this.lastValidatedAt = lastValidatedAt;
  }

  public String getConfirmationAttachmentUrl() {
    return confirmationAttachmentUrl;
  }

  public void setConfirmationAttachmentUrl(String confirmationAttachmentUrl) {
    this.confirmationAttachmentUrl = confirmationAttachmentUrl;
  }

  public String getCreatedByUserId() {
    return createdByUserId;
  }

  public void setCreatedByUserId(String createdByUserId) {
    this.createdByUserId = createdByUserId;
  }

  public String getCreatedByName() {
    return createdByName;
  }

  public void setCreatedByName(String createdByName) {
    this.createdByName = createdByName;
  }

  public String getUpdatedByUserId() {
    return updatedByUserId;
  }

  public void setUpdatedByUserId(String updatedByUserId) {
    this.updatedByUserId = updatedByUserId;
  }

  public String getUpdatedByName() {
    return updatedByName;
  }

  public void setUpdatedByName(String updatedByName) {
    this.updatedByName = updatedByName;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }

  public List<SalesOrderItemEntity> getItems() {
    return items;
  }

  public void setItems(List<SalesOrderItemEntity> items) {
    this.items = items;
  }
}
