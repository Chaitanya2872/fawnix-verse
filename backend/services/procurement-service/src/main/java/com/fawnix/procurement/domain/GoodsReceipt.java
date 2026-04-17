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
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "goods_receipts")
public class GoodsReceipt extends AuditableEntity {

  @Id
  private UUID id;

  @Column(name = "grn_number", nullable = false, unique = true, length = 40)
  private String grnNumber;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "purchase_order_id", nullable = false)
  private PurchaseOrder purchaseOrder;

  @Column(name = "receipt_date", nullable = false)
  private LocalDate receiptDate;

  @Column(name = "received_by", nullable = false)
  private UUID receivedBy;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 40)
  private GoodsReceiptStatus status;

  @Column(name = "remarks", columnDefinition = "text")
  private String remarks;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getGrnNumber() {
    return grnNumber;
  }

  public void setGrnNumber(String grnNumber) {
    this.grnNumber = grnNumber;
  }

  public PurchaseOrder getPurchaseOrder() {
    return purchaseOrder;
  }

  public void setPurchaseOrder(PurchaseOrder purchaseOrder) {
    this.purchaseOrder = purchaseOrder;
  }

  public LocalDate getReceiptDate() {
    return receiptDate;
  }

  public void setReceiptDate(LocalDate receiptDate) {
    this.receiptDate = receiptDate;
  }

  public UUID getReceivedBy() {
    return receivedBy;
  }

  public void setReceivedBy(UUID receivedBy) {
    this.receivedBy = receivedBy;
  }

  public GoodsReceiptStatus getStatus() {
    return status;
  }

  public void setStatus(GoodsReceiptStatus status) {
    this.status = status;
  }

  public String getRemarks() {
    return remarks;
  }

  public void setRemarks(String remarks) {
    this.remarks = remarks;
  }
}
