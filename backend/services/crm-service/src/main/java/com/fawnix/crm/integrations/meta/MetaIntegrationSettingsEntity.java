package com.fawnix.crm.integrations.meta;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "meta_integration_settings")
public class MetaIntegrationSettingsEntity {

  @Id
  @Column(length = 40, nullable = false)
  private String id;

  @Column(name = "access_token", columnDefinition = "text")
  private String accessToken;

  @Column(name = "form_id", length = 120)
  private String formId;

  @Column(name = "verify_token", columnDefinition = "text")
  private String verifyToken;

  @Column(name = "app_secret", columnDefinition = "text")
  private String appSecret;

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

  public String getFormId() {
    return formId;
  }

  public void setFormId(String formId) {
    this.formId = formId;
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

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
