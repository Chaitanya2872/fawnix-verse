package com.fawnix.sales.orders.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "sales_order_audit_logs")
public class SalesOrderAuditLogEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "sales_order_id", length = 36, nullable = false)
  private String salesOrderId;

  @Column(name = "action_type", length = 60, nullable = false)
  private String actionType;

  @Column(name = "actor_user_id", length = 36)
  private String actorUserId;

  @Column(name = "actor_name", length = 120)
  private String actorName;

  @Column(name = "details", columnDefinition = "text")
  private String details;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getSalesOrderId() { return salesOrderId; }
  public void setSalesOrderId(String salesOrderId) { this.salesOrderId = salesOrderId; }
  public String getActionType() { return actionType; }
  public void setActionType(String actionType) { this.actionType = actionType; }
  public String getActorUserId() { return actorUserId; }
  public void setActorUserId(String actorUserId) { this.actorUserId = actorUserId; }
  public String getActorName() { return actorName; }
  public void setActorName(String actorName) { this.actorName = actorName; }
  public String getDetails() { return details; }
  public void setDetails(String details) { this.details = details; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
