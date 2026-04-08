package com.fawnix.inventory.transactions.entity;

import com.fawnix.inventory.products.entity.ProductEntity;
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
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "stock_transactions")
public class StockTransactionEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "product_id", nullable = false)
  private ProductEntity product;

  @Column(name = "txn_ref", length = 60, nullable = false)
  private String txnRef;

  @Column(name = "txn_date", nullable = false)
  private LocalDate txnDate;

  @Enumerated(EnumType.STRING)
  @Column(name = "txn_type", length = 20, nullable = false)
  private TransactionType txnType;

  @Column(name = "vendor_name", length = 160, nullable = false)
  private String vendorName;

  @Column(name = "qty", precision = 14, scale = 2, nullable = false)
  private BigDecimal quantity = BigDecimal.ZERO;

  @Column(name = "unit_price", precision = 14, scale = 2)
  private BigDecimal unitPrice;

  @Column(name = "line_total", precision = 14, scale = 2)
  private BigDecimal lineTotal;

  @Column(name = "project_ref", length = 120)
  private String projectRef;

  @Column(name = "issued_by", length = 120)
  private String issuedBy;

  @Column(name = "notes", columnDefinition = "text")
  private String notes;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public ProductEntity getProduct() {
    return product;
  }

  public void setProduct(ProductEntity product) {
    this.product = product;
  }

  public String getTxnRef() {
    return txnRef;
  }

  public void setTxnRef(String txnRef) {
    this.txnRef = txnRef;
  }

  public LocalDate getTxnDate() {
    return txnDate;
  }

  public void setTxnDate(LocalDate txnDate) {
    this.txnDate = txnDate;
  }

  public TransactionType getTxnType() {
    return txnType;
  }

  public void setTxnType(TransactionType txnType) {
    this.txnType = txnType;
  }

  public String getVendorName() {
    return vendorName;
  }

  public void setVendorName(String vendorName) {
    this.vendorName = vendorName;
  }

  public BigDecimal getQuantity() {
    return quantity;
  }

  public void setQuantity(BigDecimal quantity) {
    this.quantity = quantity;
  }

  public BigDecimal getUnitPrice() {
    return unitPrice;
  }

  public void setUnitPrice(BigDecimal unitPrice) {
    this.unitPrice = unitPrice;
  }

  public BigDecimal getLineTotal() {
    return lineTotal;
  }

  public void setLineTotal(BigDecimal lineTotal) {
    this.lineTotal = lineTotal;
  }

  public String getProjectRef() {
    return projectRef;
  }

  public void setProjectRef(String projectRef) {
    this.projectRef = projectRef;
  }

  public String getIssuedBy() {
    return issuedBy;
  }

  public void setIssuedBy(String issuedBy) {
    this.issuedBy = issuedBy;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
