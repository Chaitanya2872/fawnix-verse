package com.fawnix.procurement.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "pr_items")
public class PurchaseRequisitionItem extends AuditableEntity {

  @Id
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "purchase_requisition_id", nullable = false)
  private PurchaseRequisition purchaseRequisition;

  @Column(name = "product_id")
  private UUID productId;

  @Column(name = "sku", length = 60)
  private String sku;

  @Column(name = "product_name", nullable = false, length = 200)
  private String productName;

  @Column(name = "category", length = 80)
  private String category;

  @Column(name = "unit", nullable = false, length = 20)
  private String unit;

  @Column(name = "quantity", nullable = false, precision = 14, scale = 2)
  private BigDecimal quantity;

  @Column(name = "estimated_unit_price", nullable = false, precision = 14, scale = 2)
  private BigDecimal estimatedUnitPrice;

  @Column(name = "line_total", nullable = false, precision = 14, scale = 2)
  private BigDecimal lineTotal;

  @Column(name = "remarks", columnDefinition = "text")
  private String remarks;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public PurchaseRequisition getPurchaseRequisition() {
    return purchaseRequisition;
  }

  public void setPurchaseRequisition(PurchaseRequisition purchaseRequisition) {
    this.purchaseRequisition = purchaseRequisition;
  }

  public UUID getProductId() {
    return productId;
  }

  public void setProductId(UUID productId) {
    this.productId = productId;
  }

  public String getSku() {
    return sku;
  }

  public void setSku(String sku) {
    this.sku = sku;
  }

  public String getProductName() {
    return productName;
  }

  public void setProductName(String productName) {
    this.productName = productName;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public String getUnit() {
    return unit;
  }

  public void setUnit(String unit) {
    this.unit = unit;
  }

  public BigDecimal getQuantity() {
    return quantity;
  }

  public void setQuantity(BigDecimal quantity) {
    this.quantity = quantity;
  }

  public BigDecimal getEstimatedUnitPrice() {
    return estimatedUnitPrice;
  }

  public void setEstimatedUnitPrice(BigDecimal estimatedUnitPrice) {
    this.estimatedUnitPrice = estimatedUnitPrice;
  }

  public BigDecimal getLineTotal() {
    return lineTotal;
  }

  public void setLineTotal(BigDecimal lineTotal) {
    this.lineTotal = lineTotal;
  }

  public String getRemarks() {
    return remarks;
  }

  public void setRemarks(String remarks) {
    this.remarks = remarks;
  }
}
