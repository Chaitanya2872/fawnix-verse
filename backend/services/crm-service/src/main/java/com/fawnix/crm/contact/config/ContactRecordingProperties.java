package com.fawnix.crm.contact.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.contact-recordings")
public class ContactRecordingProperties {

  private String storagePrefix = "contact-recordings";
  private long maxFileSizeBytes = 26_214_400L;

  public String getStoragePrefix() {
    return storagePrefix;
  }

  public void setStoragePrefix(String storagePrefix) {
    this.storagePrefix = storagePrefix;
  }

  public long getMaxFileSizeBytes() {
    return maxFileSizeBytes;
  }

  public void setMaxFileSizeBytes(long maxFileSizeBytes) {
    this.maxFileSizeBytes = maxFileSizeBytes;
  }
}
