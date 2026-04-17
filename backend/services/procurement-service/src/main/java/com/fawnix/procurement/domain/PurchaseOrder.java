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
@Table(name = "purchase_orders")
public class PurchaseOrder extends AuditableEntity {

  @Id
  private UUID id;

  @Column(name = "po_number", nullable = false, unique = true, length = 40)
  private String poNumber;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "purchase_requisition_id", nullable = false)
  private PurchaseRequisition purchaseRequisition;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "vendor_id", nullable = false)
  private Vendor vendor;

  @Column(name = "order_date", nullable = false)
  private LocalDate orderDate;

  @Column(name = "expected_delivery_date")
  private LocalDate expectedDeliveryDate;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 40)
  private PurchaseOrderStatus status;

  @Column(name = "notes", columnDefinition = "text")
  private String notes;

  @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
  private BigDecimal totalAmount;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getPoNumber() {
    return poNumber;
  }

  public void setPoNumber(String poNumber) {
    this.poNumber = poNumber;
  }

  public PurchaseRequisition getPurchaseRequisition() {
    return purchaseRequisition;
  }

  public void setPurchaseRequisition(PurchaseRequisition purchaseRequisition) {
    this.purchaseRequisition = purchaseRequisition;
  }

  public Vendor getVendor() {
    return vendor;
  }

  public void setVendor(Vendor vendor) {
    this.vendor = vendor;
  }

  public LocalDate getOrderDate() {
    return orderDate;
  }

  public void setOrderDate(LocalDate orderDate) {
    this.orderDate = orderDate;
  }

  public LocalDate getExpectedDeliveryDate() {
    return expectedDeliveryDate;
  }

  public void setExpectedDeliveryDate(LocalDate expectedDeliveryDate) {
    this.expectedDeliveryDate = expectedDeliveryDate;
  }

  public PurchaseOrderStatus getStatus() {
    return status;
  }

  public void setStatus(PurchaseOrderStatus status) {
    this.status = status;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public BigDecimal getTotalAmount() {
    return totalAmount;
  }

  public void setTotalAmount(BigDecimal totalAmount) {
    this.totalAmount = totalAmount;
  }
}
