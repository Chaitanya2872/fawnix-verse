package com.fawnix.sales.deliveries.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "sales_deliveries")
public class SalesDeliveryEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "delivery_number", length = 32, nullable = false, unique = true)
  private String deliveryNumber;

  @Column(name = "sales_order_id", length = 36, nullable = false)
  private String salesOrderId;

  @Column(name = "sales_order_number", length = 32, nullable = false)
  private String salesOrderNumber;

  @Column(name = "customer_name", length = 160, nullable = false)
  private String customerName;

  @Column(name = "company", length = 160)
  private String company;

  @Column(name = "shipping_address", columnDefinition = "text")
  private String shippingAddress;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", length = 40, nullable = false)
  private SalesDeliveryStatus status;

  @Column(name = "scheduled_date")
  private LocalDate scheduledDate;

  @Column(name = "dispatched_at")
  private Instant dispatchedAt;

  @Column(name = "delivered_at")
  private Instant deliveredAt;

  @Column(name = "carrier", length = 120)
  private String carrier;

  @Column(name = "tracking_number", length = 120)
  private String trackingNumber;

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
  public String getDeliveryNumber() { return deliveryNumber; }
  public void setDeliveryNumber(String deliveryNumber) { this.deliveryNumber = deliveryNumber; }
  public String getSalesOrderId() { return salesOrderId; }
  public void setSalesOrderId(String salesOrderId) { this.salesOrderId = salesOrderId; }
  public String getSalesOrderNumber() { return salesOrderNumber; }
  public void setSalesOrderNumber(String salesOrderNumber) { this.salesOrderNumber = salesOrderNumber; }
  public String getCustomerName() { return customerName; }
  public void setCustomerName(String customerName) { this.customerName = customerName; }
  public String getCompany() { return company; }
  public void setCompany(String company) { this.company = company; }
  public String getShippingAddress() { return shippingAddress; }
  public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }
  public SalesDeliveryStatus getStatus() { return status; }
  public void setStatus(SalesDeliveryStatus status) { this.status = status; }
  public LocalDate getScheduledDate() { return scheduledDate; }
  public void setScheduledDate(LocalDate scheduledDate) { this.scheduledDate = scheduledDate; }
  public Instant getDispatchedAt() { return dispatchedAt; }
  public void setDispatchedAt(Instant dispatchedAt) { this.dispatchedAt = dispatchedAt; }
  public Instant getDeliveredAt() { return deliveredAt; }
  public void setDeliveredAt(Instant deliveredAt) { this.deliveredAt = deliveredAt; }
  public String getCarrier() { return carrier; }
  public void setCarrier(String carrier) { this.carrier = carrier; }
  public String getTrackingNumber() { return trackingNumber; }
  public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }
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
