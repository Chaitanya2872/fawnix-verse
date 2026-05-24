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

  @Enumerated(EnumType.STRING)
  @Column(name = "status", length = 40, nullable = false)
  private SalesOrderStatus status;

  @Column(name = "subtotal", precision = 14, scale = 2, nullable = false)
  private BigDecimal subtotal = BigDecimal.ZERO;

  @Column(name = "tax_rate", precision = 5, scale = 2)
  private BigDecimal taxRate = BigDecimal.ZERO;

  @Column(name = "tax_total", precision = 14, scale = 2, nullable = false)
  private BigDecimal taxTotal = BigDecimal.ZERO;

  @Column(name = "total", precision = 14, scale = 2, nullable = false)
  private BigDecimal total = BigDecimal.ZERO;

  @Column(name = "notes", columnDefinition = "text")
  private String notes;

  @Column(name = "inventory_reserved", nullable = false)
  private boolean inventoryReserved;

  @Column(name = "inventory_reservation_message", columnDefinition = "text")
  private String inventoryReservationMessage;

  @Column(name = "inventory_reserved_at")
  private Instant inventoryReservedAt;

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

  public BigDecimal getTotal() {
    return total;
  }

  public void setTotal(BigDecimal total) {
    this.total = total;
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
