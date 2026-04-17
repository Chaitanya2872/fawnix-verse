package com.fawnix.procurement.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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

  @Column(name = "email", length = 160)
  private String email;

  @Column(name = "phone", length = 40)
  private String phone;

  @Column(name = "tax_identifier", length = 80)
  private String taxIdentifier;

  @Column(name = "address_line_1", length = 255)
  private String addressLine1;

  @Column(name = "address_line_2", length = 255)
  private String addressLine2;

  @Column(name = "city", length = 80)
  private String city;

  @Column(name = "state", length = 80)
  private String state;

  @Column(name = "country", length = 80)
  private String country;

  @Column(name = "postal_code", length = 20)
  private String postalCode;

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

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getTaxIdentifier() {
    return taxIdentifier;
  }

  public void setTaxIdentifier(String taxIdentifier) {
    this.taxIdentifier = taxIdentifier;
  }

  public String getAddressLine1() {
    return addressLine1;
  }

  public void setAddressLine1(String addressLine1) {
    this.addressLine1 = addressLine1;
  }

  public String getAddressLine2() {
    return addressLine2;
  }

  public void setAddressLine2(String addressLine2) {
    this.addressLine2 = addressLine2;
  }

  public String getCity() {
    return city;
  }

  public void setCity(String city) {
    this.city = city;
  }

  public String getState() {
    return state;
  }

  public void setState(String state) {
    this.state = state;
  }

  public String getCountry() {
    return country;
  }

  public void setCountry(String country) {
    this.country = country;
  }

  public String getPostalCode() {
    return postalCode;
  }

  public void setPostalCode(String postalCode) {
    this.postalCode = postalCode;
  }
}
