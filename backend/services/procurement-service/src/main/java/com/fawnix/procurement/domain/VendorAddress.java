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
@Table(name = "vendor_addresses")
public class VendorAddress extends AuditableEntity {

  @Id
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "vendor_id", nullable = false)
  private Vendor vendor;

  @Enumerated(EnumType.STRING)
  @Column(name = "address_type", nullable = false, length = 20)
  private VendorAddressType addressType;

  @Column(name = "label", length = 80)
  private String label;

  @Column(name = "attention", length = 160)
  private String attention;

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

  @Column(name = "is_primary", nullable = false)
  private boolean primaryAddress;

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

  public VendorAddressType getAddressType() {
    return addressType;
  }

  public void setAddressType(VendorAddressType addressType) {
    this.addressType = addressType;
  }

  public String getLabel() {
    return label;
  }

  public void setLabel(String label) {
    this.label = label;
  }

  public String getAttention() {
    return attention;
  }

  public void setAttention(String attention) {
    this.attention = attention;
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

  public boolean isPrimaryAddress() {
    return primaryAddress;
  }

  public void setPrimaryAddress(boolean primaryAddress) {
    this.primaryAddress = primaryAddress;
  }
}
