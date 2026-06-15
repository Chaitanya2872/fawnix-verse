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
import java.util.UUID;

@Entity
@Table(name = "vendor_bank_accounts")
public class VendorBankAccount extends AuditableEntity {

  @Id
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "vendor_id", nullable = false)
  private Vendor vendor;

  @Column(name = "account_holder_name", length = 160)
  private String accountHolderName;

  @Column(name = "bank_name", length = 160)
  private String bankName;

  @Column(name = "account_number", length = 64)
  private String accountNumber;

  @Column(name = "ifsc_code", length = 20)
  private String ifscCode;

  @Column(name = "branch_name", length = 160)
  private String branchName;

  @Column(name = "upi_id", length = 120)
  private String upiId;

  @Enumerated(EnumType.STRING)
  @Column(name = "account_type", length = 30)
  private VendorAccountType accountType;

  @Column(name = "is_primary", nullable = false)
  private boolean primaryAccount;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public Vendor getVendor() {
    return vendor;
  }

  public void setVendor(Vendor vendor) {
    this.vendor = vendor;
  }

  public String getAccountHolderName() {
    return accountHolderName;
  }

  public void setAccountHolderName(String accountHolderName) {
    this.accountHolderName = accountHolderName;
  }

  public String getBankName() {
    return bankName;
  }

  public void setBankName(String bankName) {
    this.bankName = bankName;
  }

  public String getAccountNumber() {
    return accountNumber;
  }

  public void setAccountNumber(String accountNumber) {
    this.accountNumber = accountNumber;
  }

  public String getIfscCode() {
    return ifscCode;
  }

  public void setIfscCode(String ifscCode) {
    this.ifscCode = ifscCode;
  }

  public String getBranchName() {
    return branchName;
  }

  public void setBranchName(String branchName) {
    this.branchName = branchName;
  }

  public String getUpiId() {
    return upiId;
  }

  public void setUpiId(String upiId) {
    this.upiId = upiId;
  }

  public VendorAccountType getAccountType() {
    return accountType;
  }

  public void setAccountType(VendorAccountType accountType) {
    this.accountType = accountType;
  }

  public boolean isPrimaryAccount() {
    return primaryAccount;
  }

  public void setPrimaryAccount(boolean primaryAccount) {
    this.primaryAccount = primaryAccount;
  }
}
