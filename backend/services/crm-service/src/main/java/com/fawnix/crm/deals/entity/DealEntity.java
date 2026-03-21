package com.fawnix.crm.deals.entity;

import com.fawnix.crm.accounts.entity.AccountEntity;
import com.fawnix.crm.contacts.entity.ContactEntity;
import com.fawnix.crm.leads.entity.LeadStatus;
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

@Entity
@Table(name = "deals")
public class DealEntity {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(nullable = false, length = 160)
  private String name;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "account_id")
  private AccountEntity account;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "contact_id")
  private ContactEntity contact;

  @Column(name = "lead_id", length = 36)
  private String leadId;

  @Enumerated(EnumType.STRING)
  @Column(name = "stage", nullable = false, length = 40)
  private LeadStatus stage;

  @Column(name = "value", nullable = false, precision = 14, scale = 2)
  private BigDecimal value = BigDecimal.ZERO;

  @Column(name = "probability")
  private Integer probability;

  @Column(name = "expected_close_at")
  private Instant expectedCloseAt;

  @Column(name = "owner_user_id", length = 36)
  private String ownerUserId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public AccountEntity getAccount() {
    return account;
  }

  public void setAccount(AccountEntity account) {
    this.account = account;
  }

  public ContactEntity getContact() {
    return contact;
  }

  public void setContact(ContactEntity contact) {
    this.contact = contact;
  }

  public String getLeadId() {
    return leadId;
  }

  public void setLeadId(String leadId) {
    this.leadId = leadId;
  }

  public LeadStatus getStage() {
    return stage;
  }

  public void setStage(LeadStatus stage) {
    this.stage = stage;
  }

  public BigDecimal getValue() {
    return value;
  }

  public void setValue(BigDecimal value) {
    this.value = value;
  }

  public Integer getProbability() {
    return probability;
  }

  public void setProbability(Integer probability) {
    this.probability = probability;
  }

  public Instant getExpectedCloseAt() {
    return expectedCloseAt;
  }

  public void setExpectedCloseAt(Instant expectedCloseAt) {
    this.expectedCloseAt = expectedCloseAt;
  }

  public String getOwnerUserId() {
    return ownerUserId;
  }

  public void setOwnerUserId(String ownerUserId) {
    this.ownerUserId = ownerUserId;
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
}
