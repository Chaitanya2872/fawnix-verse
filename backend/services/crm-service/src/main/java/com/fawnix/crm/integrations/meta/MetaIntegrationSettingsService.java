package com.fawnix.crm.integrations.meta;

import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class MetaIntegrationSettingsService {

  private static final String SETTINGS_ID = "meta";

  private final MetaIntegrationSettingsRepository repository;
  private final MetaLeadProperties properties;

  public MetaIntegrationSettingsService(
      MetaIntegrationSettingsRepository repository,
      MetaLeadProperties properties
  ) {
    this.repository = repository;
    this.properties = properties;
  }

  @Transactional(readOnly = true)
  public Optional<MetaIntegrationSettingsEntity> getSettings() {
    return repository.findById(SETTINGS_ID);
  }

  @Transactional
  public MetaIntegrationSettingsEntity upsertSettings(
      String accessToken,
      String formId,
      String verifyToken,
      String appSecret
  ) {
    MetaIntegrationSettingsEntity entity = repository.findById(SETTINGS_ID)
        .orElseGet(() -> {
          MetaIntegrationSettingsEntity created = new MetaIntegrationSettingsEntity();
          created.setId(SETTINGS_ID);
          return created;
        });
    entity.setAccessToken(StringUtils.hasText(accessToken) ? accessToken.trim() : null);
    entity.setFormId(StringUtils.hasText(formId) ? formId.trim() : null);
    entity.setVerifyToken(StringUtils.hasText(verifyToken) ? verifyToken.trim() : null);
    entity.setAppSecret(StringUtils.hasText(appSecret) ? appSecret.trim() : null);
    entity.setUpdatedAt(Instant.now());
    return repository.save(entity);
  }

  public String resolveAccessToken() {
    Optional<MetaIntegrationSettingsEntity> settings = getSettings();
    if (settings.isPresent() && StringUtils.hasText(settings.get().getAccessToken())) {
      return settings.get().getAccessToken();
    }
    return properties.accessToken();
  }

  public String resolveFormId() {
    Optional<MetaIntegrationSettingsEntity> settings = getSettings();
    if (settings.isPresent() && StringUtils.hasText(settings.get().getFormId())) {
      return settings.get().getFormId();
    }
    return null;
  }

  public String resolveVerifyToken() {
    Optional<MetaIntegrationSettingsEntity> settings = getSettings();
    if (settings.isPresent() && StringUtils.hasText(settings.get().getVerifyToken())) {
      return settings.get().getVerifyToken();
    }
    return properties.verifyToken();
  }

  public String resolveAppSecret() {
    Optional<MetaIntegrationSettingsEntity> settings = getSettings();
    if (settings.isPresent() && StringUtils.hasText(settings.get().getAppSecret())) {
      return settings.get().getAppSecret();
    }
    return properties.appSecret();
  }
}
