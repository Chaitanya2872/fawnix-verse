package com.fawnix.crm.integrations.meta;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integrations/meta/settings")
public class MetaIntegrationSettingsController {

  private final MetaIntegrationSettingsService settingsService;
  private final MetaIntegrationTestService testService;
  private final MetaLeadProperties properties;

  public MetaIntegrationSettingsController(
      MetaIntegrationSettingsService settingsService,
      MetaIntegrationTestService testService,
      MetaLeadProperties properties
  ) {
    this.settingsService = settingsService;
    this.testService = testService;
    this.properties = properties;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public ResponseEntity<MetaIntegrationSettingsResponse> getSettings() {
    return settingsService.getSettings()
        .map(settings -> ResponseEntity.ok(toResponse(settings)))
        .orElseGet(() -> ResponseEntity.ok(new MetaIntegrationSettingsResponse(
            "",
            "",
            "",
            "",
            properties.enabled()
        )));
  }

  @PutMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public MetaIntegrationSettingsResponse updateSettings(
      @RequestBody MetaIntegrationSettingsRequest request
  ) {
    MetaIntegrationSettingsEntity updated = settingsService.upsertSettings(
        request.accessToken(),
        request.formId(),
        request.verifyToken(),
        request.appSecret()
    );
    return toResponse(updated);
  }

  @PostMapping("/test")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public MetaIntegrationTestResponse testConnection() {
    return testService.testConnection();
  }

  private MetaIntegrationSettingsResponse toResponse(MetaIntegrationSettingsEntity entity) {
    return new MetaIntegrationSettingsResponse(
        entity.getAccessToken() != null ? entity.getAccessToken() : "",
        entity.getFormId() != null ? entity.getFormId() : "",
        entity.getVerifyToken() != null ? entity.getVerifyToken() : "",
        entity.getAppSecret() != null ? entity.getAppSecret() : "",
        properties.enabled()
    );
  }

  public record MetaIntegrationSettingsRequest(
      String accessToken,
      String formId,
      String verifyToken,
      String appSecret
  ) {
  }

  public record MetaIntegrationSettingsResponse(
      String accessToken,
      String formId,
      String verifyToken,
      String appSecret,
      boolean enabled
  ) {
  }

  public record MetaIntegrationTestResponse(
      boolean ok,
      String message,
      String pageId,
      String pageName,
      String formId,
      String formName
  ) {
  }
}
