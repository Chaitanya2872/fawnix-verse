package com.fawnix.crm.storage.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.object-storage")
public class ObjectStorageProperties {

  private String endpoint = "http://localhost:9000";
  private String accessKey = "minioadmin";
  private String secretKey = "minioadmin";
  private String bucket = "fawnix-objects";
  private boolean secure;
  private boolean autoCreateBucket = true;
  private String contactRecordingsPrefix = "contact-recordings";
  private String attachmentsPrefix = "attachments";

  public String getEndpoint() {
    return endpoint;
  }

  public void setEndpoint(String endpoint) {
    this.endpoint = endpoint;
  }

  public String getAccessKey() {
    return accessKey;
  }

  public void setAccessKey(String accessKey) {
    this.accessKey = accessKey;
  }

  public String getSecretKey() {
    return secretKey;
  }

  public void setSecretKey(String secretKey) {
    this.secretKey = secretKey;
  }

  public String getBucket() {
    return bucket;
  }

  public void setBucket(String bucket) {
    this.bucket = bucket;
  }

  public boolean isSecure() {
    return secure;
  }

  public void setSecure(boolean secure) {
    this.secure = secure;
  }

  public boolean isAutoCreateBucket() {
    return autoCreateBucket;
  }

  public void setAutoCreateBucket(boolean autoCreateBucket) {
    this.autoCreateBucket = autoCreateBucket;
  }

  public String getContactRecordingsPrefix() {
    return contactRecordingsPrefix;
  }

  public void setContactRecordingsPrefix(String contactRecordingsPrefix) {
    this.contactRecordingsPrefix = contactRecordingsPrefix;
  }

  public String getAttachmentsPrefix() {
    return attachmentsPrefix;
  }

  public void setAttachmentsPrefix(String attachmentsPrefix) {
    this.attachmentsPrefix = attachmentsPrefix;
  }
}
