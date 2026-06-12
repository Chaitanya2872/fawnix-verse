package com.fawnix.procurement.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "vendors")
public class Vendor extends AuditableEntity {

  @Id
  private UUID id;

  @Column(name = "vendor_code", nullable = false, unique = true, length = 40)
  private String vendorCode;

  @Column(name = "vendor_name", nullable = false, length = 160)
  private String vendorName;

  @Column(name = "vendor_type", length = 80)
  private String vendorType;

  @Column(name = "salutation", length = 20)
  private String salutation;

  @Column(name = "first_name", length = 80)
  private String firstName;

  @Column(name = "last_name", length = 80)
  private String lastName;

  @Column(name = "company_name", length = 160)
  private String companyName;

  @Column(name = "phone", length = 40)
  private String phone;

  @Column(name = "work_phone", length = 40)
  private String workPhone;

  @Column(name = "mobile", length = 40)
  private String mobile;

  @Column(name = "email", length = 160)
  private String email;

  @Column(name = "vendor_language", length = 60)
  private String vendorLanguage;

  @Column(name = "gst_number", length = 20)
  private String gstNumber;

  @Column(name = "pan_number", length = 20)
  private String panNumber;

  @Column(name = "website", length = 255)
  private String website;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 20)
  private VendorStatus status = VendorStatus.ACTIVE;

  @Column(name = "remarks", length = 4000)
  private String remarks;

  @OneToMany(mappedBy = "vendor", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("addressType asc, primaryAddress desc, createdAt asc")
  private List<VendorAddress> addresses = new ArrayList<>();

  @OneToMany(mappedBy = "vendor", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("primaryContact desc, createdAt asc")
  private List<VendorContactPerson> contactPersons = new ArrayList<>();

  @OneToMany(mappedBy = "vendor", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("primaryAccount desc, createdAt asc")
  private List<VendorBankAccount> bankAccounts = new ArrayList<>();

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getVendorCode() {
    return vendorCode;
  }

  public void setVendorCode(String vendorCode) {
    this.vendorCode = vendorCode;
  }

  public String getVendorName() {
    return vendorName;
  }

  public void setVendorName(String vendorName) {
    this.vendorName = vendorName;
  }

  public String getVendorType() {
    return vendorType;
  }

  public void setVendorType(String vendorType) {
    this.vendorType = vendorType;
  }

  public String getSalutation() {
    return salutation;
  }

  public void setSalutation(String salutation) {
    this.salutation = salutation;
  }

  public String getFirstName() {
    return firstName;
  }

  public void setFirstName(String firstName) {
    this.firstName = firstName;
  }

  public String getLastName() {
    return lastName;
  }

  public void setLastName(String lastName) {
    this.lastName = lastName;
  }

  public String getCompanyName() {
    return companyName;
  }

  public void setCompanyName(String companyName) {
    this.companyName = companyName;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getWorkPhone() {
    return workPhone;
  }

  public void setWorkPhone(String workPhone) {
    this.workPhone = workPhone;
  }

  public String getMobile() {
    return mobile;
  }

  public void setMobile(String mobile) {
    this.mobile = mobile;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getVendorLanguage() {
    return vendorLanguage;
  }

  public void setVendorLanguage(String vendorLanguage) {
    this.vendorLanguage = vendorLanguage;
  }

  public String getGstNumber() {
    return gstNumber;
  }

  public void setGstNumber(String gstNumber) {
    this.gstNumber = gstNumber;
  }

  public String getPanNumber() {
    return panNumber;
  }

  public void setPanNumber(String panNumber) {
    this.panNumber = panNumber;
  }

  public String getWebsite() {
    return website;
  }

  public void setWebsite(String website) {
    this.website = website;
  }

  public VendorStatus getStatus() {
    return status;
  }

  public void setStatus(VendorStatus status) {
    this.status = status;
  }

  public String getRemarks() {
    return remarks;
  }

  public void setRemarks(String remarks) {
    this.remarks = remarks;
  }

  public List<VendorAddress> getAddresses() {
    return addresses;
  }

  public void setAddresses(List<VendorAddress> addresses) {
    this.addresses = addresses;
  }

  public List<VendorContactPerson> getContactPersons() {
    return contactPersons;
  }

  public void setContactPersons(List<VendorContactPerson> contactPersons) {
    this.contactPersons = contactPersons;
  }

  public List<VendorBankAccount> getBankAccounts() {
    return bankAccounts;
  }

  public void setBankAccounts(List<VendorBankAccount> bankAccounts) {
    this.bankAccounts = bankAccounts;
  }
}
