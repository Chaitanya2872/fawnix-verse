package com.fawnix.crm.integrations.whatsapp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "whatsapp_integration_settings")
public class WhatsappIntegrationSettingsEntity {

  @Id
  @Column(length = 40, nullable = false)
  private String id;

  @Column(name = "access_token", columnDefinition = "text")
  private String accessToken;

  @Column(name = "phone_number_id", length = 64)
  private String phoneNumberId;

  @Column(name = "business_account_id", length = 64)
  private String businessAccountId;

  @Column(name = "verify_token", columnDefinition = "text")
  private String verifyToken;

  @Column(name = "app_secret", columnDefinition = "text")
  private String appSecret;

  @Column(name = "template_name", length = 120)
  private String templateName;

  @Column(name = "template_language", length = 20)
  private String templateLanguage;

  @Column(name = "template_use_lead_name")
  private Boolean templateUseLeadName;

  @Column(name = "default_country_code", length = 10)
  private String defaultCountryCode;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getAccessToken() {
    return accessToken;
  }

  public void setAccessToken(String accessToken) {
    this.accessToken = accessToken;
  }

  public String getPhoneNumberId() {
    return phoneNumberId;
  }

  public void setPhoneNumberId(String phoneNumberId) {
    this.phoneNumberId = phoneNumberId;
  }

  public String getBusinessAccountId() {
    return businessAccountId;
  }

  public void setBusinessAccountId(String businessAccountId) {
    this.businessAccountId = businessAccountId;
  }

  public String getVerifyToken() {
    return verifyToken;
  }

  public void setVerifyToken(String verifyToken) {
    this.verifyToken = verifyToken;
  }

  public String getAppSecret() {
    return appSecret;
  }

  public void setAppSecret(String appSecret) {
    this.appSecret = appSecret;
  }

  public String getTemplateName() {
    return templateName;
  }

  public void setTemplateName(String templateName) {
    this.templateName = templateName;
  }

  public String getTemplateLanguage() {
    return templateLanguage;
  }

  public void setTemplateLanguage(String templateLanguage) {
    this.templateLanguage = templateLanguage;
  }

  public Boolean getTemplateUseLeadName() {
    return templateUseLeadName;
  }

  public void setTemplateUseLeadName(Boolean templateUseLeadName) {
    this.templateUseLeadName = templateUseLeadName;
  }

  public String getDefaultCountryCode() {
    return defaultCountryCode;
  }

  public void setDefaultCountryCode(String defaultCountryCode) {
    this.defaultCountryCode = defaultCountryCode;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
