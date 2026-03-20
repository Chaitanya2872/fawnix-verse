package com.fawnix.crm.integrations.whatsapp;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integrations/whatsapp/settings")
public class WhatsappIntegrationSettingsController {

  private final WhatsappIntegrationSettingsService settingsService;
  private final WhatsappIntegrationTestService testService;

  public WhatsappIntegrationSettingsController(
      WhatsappIntegrationSettingsService settingsService,
      WhatsappIntegrationTestService testService
  ) {
    this.settingsService = settingsService;
    this.testService = testService;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public ResponseEntity<WhatsappIntegrationSettingsResponse> getSettings() {
    return settingsService.getSettings()
        .map(settings -> ResponseEntity.ok(toResponse(settings)))
        .orElseGet(() -> ResponseEntity.ok(new WhatsappIntegrationSettingsResponse(
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            false,
            "",
            "",
            ""
        )));
  }

  @PutMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public WhatsappIntegrationSettingsResponse updateSettings(
      @RequestBody WhatsappIntegrationSettingsRequest request
  ) {
    WhatsappIntegrationSettingsEntity updated = settingsService.upsertSettings(
        new WhatsappIntegrationSettingsService.WhatsappIntegrationSettingsRequest(
            request.accessToken(),
            request.phoneNumberId(),
            request.businessAccountId(),
            request.verifyToken(),
            request.appSecret(),
            request.templateName(),
            request.templateLanguage(),
            request.templateUseLeadName(),
            request.assignTemplateName(),
            request.assignTemplateLanguage(),
            request.defaultCountryCode()
        )
    );
    return toResponse(updated);
  }

  @PostMapping("/test")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public WhatsappIntegrationTestResponse testConnection() {
    return testService.testConnection();
  }

  private WhatsappIntegrationSettingsResponse toResponse(WhatsappIntegrationSettingsEntity entity) {
    return new WhatsappIntegrationSettingsResponse(
        entity.getAccessToken() != null ? entity.getAccessToken() : "",
        entity.getPhoneNumberId() != null ? entity.getPhoneNumberId() : "",
        entity.getBusinessAccountId() != null ? entity.getBusinessAccountId() : "",
        entity.getVerifyToken() != null ? entity.getVerifyToken() : "",
        entity.getAppSecret() != null ? entity.getAppSecret() : "",
        entity.getTemplateName() != null ? entity.getTemplateName() : "",
        entity.getTemplateLanguage() != null ? entity.getTemplateLanguage() : "",
        entity.getTemplateUseLeadName() != null && entity.getTemplateUseLeadName(),
        entity.getAssignTemplateName() != null ? entity.getAssignTemplateName() : "",
        entity.getAssignTemplateLanguage() != null ? entity.getAssignTemplateLanguage() : "",
        entity.getDefaultCountryCode() != null ? entity.getDefaultCountryCode() : ""
    );
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

  public record WhatsappIntegrationSettingsResponse(
      String accessToken,
      String phoneNumberId,
      String businessAccountId,
      String verifyToken,
      String appSecret,
      String templateName,
      String templateLanguage,
      boolean templateUseLeadName,
      String assignTemplateName,
      String assignTemplateLanguage,
      String defaultCountryCode
  ) {
  }

  public record WhatsappIntegrationTestResponse(
      boolean ok,
      String message,
      String phoneNumberId,
      String displayPhoneNumber,
      String verifiedName
  ) {
  }
}
