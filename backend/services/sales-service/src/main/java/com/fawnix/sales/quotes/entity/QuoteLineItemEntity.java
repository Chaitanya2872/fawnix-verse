package com.fawnix.sales.quotes.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "quote_items")
public class QuoteLineItemEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "quote_id", nullable = false)
  private QuoteEntity quote;

  @Column(name = "position", nullable = false)
  private int position;

  @Column(name = "name", length = 160, nullable = false)
  private String name;

  @Column(name = "inventory_product_id", length = 36)
  private String inventoryProductId;

  @Column(name = "make", length = 120)
  private String make;

  @Column(name = "description", columnDefinition = "text")
  private String description;

  @Column(name = "utility", columnDefinition = "text")
  private String utility;

  @Column(name = "quantity", precision = 12, scale = 2, nullable = false)
  private BigDecimal quantity = BigDecimal.ZERO;

  @Column(name = "unit", length = 40)
  private String unit;

  @Column(name = "unit_price", precision = 14, scale = 2, nullable = false)
  private BigDecimal unitPrice = BigDecimal.ZERO;

  @Column(name = "line_total", precision = 14, scale = 2, nullable = false)
  private BigDecimal lineTotal = BigDecimal.ZERO;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public QuoteEntity getQuote() {
    return quote;
  }

  public void setQuote(QuoteEntity quote) {
    this.quote = quote;
  }

  public int getPosition() {
    return position;
  }

  public void setPosition(int position) {
    this.position = position;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getInventoryProductId() {
    return inventoryProductId;
  }

  public void setInventoryProductId(String inventoryProductId) {
    this.inventoryProductId = inventoryProductId;
  }

  public String getMake() {
    return make;
  }

  public void setMake(String make) {
    this.make = make;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getUtility() {
    return utility;
  }

  public void setUtility(String utility) {
    this.utility = utility;
  }

  public BigDecimal getQuantity() {
    return quantity;
  }

  public void setQuantity(BigDecimal quantity) {
    this.quantity = quantity;
  }

  public String getUnit() {
    return unit;
  }

  public void setUnit(String unit) {
    this.unit = unit;
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
}
