package com.fawnix.sales.orders.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "sales_order_approval_rules")
public class SalesOrderApprovalRuleEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "role_key", length = 80, nullable = false)
  private String roleKey;

  @Column(name = "role_label", length = 120, nullable = false)
  private String roleLabel;

  @Column(name = "sequence_no", nullable = false)
  private int sequenceNo;

  @Column(name = "min_order_value", precision = 14, scale = 2)
  private BigDecimal minOrderValue;

  @Column(name = "max_order_value", precision = 14, scale = 2)
  private BigDecimal maxOrderValue;

  @Column(name = "require_credit_limit_breach", nullable = false)
  private boolean requireCreditLimitBreach;

  @Column(name = "require_inventory_shortage", nullable = false)
  private boolean requireInventoryShortage;

  @Column(name = "require_risky_terms", nullable = false)
  private boolean requireRiskyTerms;

  @Column(name = "require_special_discount", nullable = false)
  private boolean requireSpecialDiscount;

  @Column(name = "active", nullable = false)
  private boolean active = true;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getRoleKey() { return roleKey; }
  public void setRoleKey(String roleKey) { this.roleKey = roleKey; }
  public String getRoleLabel() { return roleLabel; }
  public void setRoleLabel(String roleLabel) { this.roleLabel = roleLabel; }
  public int getSequenceNo() { return sequenceNo; }
  public void setSequenceNo(int sequenceNo) { this.sequenceNo = sequenceNo; }
  public BigDecimal getMinOrderValue() { return minOrderValue; }
  public void setMinOrderValue(BigDecimal minOrderValue) { this.minOrderValue = minOrderValue; }
  public BigDecimal getMaxOrderValue() { return maxOrderValue; }
  public void setMaxOrderValue(BigDecimal maxOrderValue) { this.maxOrderValue = maxOrderValue; }
  public boolean isRequireCreditLimitBreach() { return requireCreditLimitBreach; }
  public void setRequireCreditLimitBreach(boolean requireCreditLimitBreach) { this.requireCreditLimitBreach = requireCreditLimitBreach; }
  public boolean isRequireInventoryShortage() { return requireInventoryShortage; }
  public void setRequireInventoryShortage(boolean requireInventoryShortage) { this.requireInventoryShortage = requireInventoryShortage; }
  public boolean isRequireRiskyTerms() { return requireRiskyTerms; }
  public void setRequireRiskyTerms(boolean requireRiskyTerms) { this.requireRiskyTerms = requireRiskyTerms; }
  public boolean isRequireSpecialDiscount() { return requireSpecialDiscount; }
  public void setRequireSpecialDiscount(boolean requireSpecialDiscount) { this.requireSpecialDiscount = requireSpecialDiscount; }
  public boolean isActive() { return active; }
  public void setActive(boolean active) { this.active = active; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
