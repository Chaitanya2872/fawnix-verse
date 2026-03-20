package com.fawnix.crm.integrations.whatsapp;

import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class WhatsappIntegrationSettingsService {

  private static final String SETTINGS_ID = "whatsapp";

  private final WhatsappIntegrationSettingsRepository repository;
  private final WhatsappProperties properties;

  public WhatsappIntegrationSettingsService(
      WhatsappIntegrationSettingsRepository repository,
      WhatsappProperties properties
  ) {
    this.repository = repository;
    this.properties = properties;
  }

  @Transactional(readOnly = true)
  public Optional<WhatsappIntegrationSettingsEntity> getSettings() {
    return repository.findById(SETTINGS_ID);
  }

  @Transactional
  public WhatsappIntegrationSettingsEntity upsertSettings(
      WhatsappIntegrationSettingsRequest request
  ) {
    WhatsappIntegrationSettingsEntity entity = repository.findById(SETTINGS_ID)
        .orElseGet(() -> {
          WhatsappIntegrationSettingsEntity created = new WhatsappIntegrationSettingsEntity();
          created.setId(SETTINGS_ID);
          return created;
        });

    entity.setAccessToken(trimOrNull(request.accessToken()));
    entity.setPhoneNumberId(trimOrNull(request.phoneNumberId()));
    entity.setBusinessAccountId(trimOrNull(request.businessAccountId()));
    entity.setVerifyToken(trimOrNull(request.verifyToken()));
    entity.setAppSecret(trimOrNull(request.appSecret()));
    entity.setTemplateName(trimOrNull(request.templateName()));
    entity.setTemplateLanguage(trimOrNull(request.templateLanguage()));
    entity.setTemplateUseLeadName(request.templateUseLeadName());
    entity.setAssignTemplateName(trimOrNull(request.assignTemplateName()));
    entity.setAssignTemplateLanguage(trimOrNull(request.assignTemplateLanguage()));
    entity.setDefaultCountryCode(trimOrNull(request.defaultCountryCode()));
    entity.setUpdatedAt(Instant.now());

    return repository.save(entity);
  }

  public String resolveAccessToken() {
    return resolveValue(WhatsappIntegrationSettingsEntity::getAccessToken, properties.accessToken());
  }

  public String resolvePhoneNumberId() {
    return resolveValue(WhatsappIntegrationSettingsEntity::getPhoneNumberId, properties.phoneNumberId());
  }

  public String resolveBusinessAccountId() {
    return resolveValue(WhatsappIntegrationSettingsEntity::getBusinessAccountId, properties.businessAccountId());
  }

  public String resolveVerifyToken() {
    return resolveValue(WhatsappIntegrationSettingsEntity::getVerifyToken, properties.verifyToken());
  }

  public String resolveAppSecret() {
    return resolveValue(WhatsappIntegrationSettingsEntity::getAppSecret, properties.appSecret());
  }

  public String resolveTemplateName() {
    return resolveValue(WhatsappIntegrationSettingsEntity::getTemplateName, properties.templateName());
  }

  public String resolveTemplateLanguage() {
    return resolveValue(WhatsappIntegrationSettingsEntity::getTemplateLanguage, properties.templateLanguage());
  }

  public boolean resolveTemplateUseLeadName() {
    Optional<WhatsappIntegrationSettingsEntity> settings = getSettings();
    if (settings.isPresent() && settings.get().getTemplateUseLeadName() != null) {
      return Boolean.TRUE.equals(settings.get().getTemplateUseLeadName());
    }
    return properties.templateUseLeadName();
  }

  public String resolveAssignTemplateName() {
    return resolveValue(WhatsappIntegrationSettingsEntity::getAssignTemplateName, properties.assignTemplateName());
  }

  public String resolveAssignTemplateLanguage() {
    return resolveValue(WhatsappIntegrationSettingsEntity::getAssignTemplateLanguage, properties.assignTemplateLanguage());
  }

  public String resolveDefaultCountryCode() {
    return resolveValue(WhatsappIntegrationSettingsEntity::getDefaultCountryCode, properties.defaultCountryCode());
  }

  private String resolveValue(java.util.function.Function<WhatsappIntegrationSettingsEntity, String> getter, String fallback) {
    Optional<WhatsappIntegrationSettingsEntity> settings = getSettings();
    if (settings.isPresent()) {
      String value = getter.apply(settings.get());
      if (StringUtils.hasText(value)) {
        return value;
      }
    }
    return fallback;
  }

  private String trimOrNull(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return value.trim();
  }

  public record WhatsappIntegrationSettingsRequest(
      String accessToken,
      String phoneNumberId,
      String businessAccountId,
      String verifyToken,
      String appSecret,
      String templateName,
      String templateLanguage,
      Boolean templateUseLeadName,
      String assignTemplateName,
      String assignTemplateLanguage,
      String defaultCountryCode
  ) {
  }
}
