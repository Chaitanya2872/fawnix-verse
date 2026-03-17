package com.fawnix.crm.integrations.meta;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integrations/meta")
public class MetaLeadWebhookController {

  private final MetaLeadProperties properties;
  private final MetaLeadService metaLeadService;
  private final MetaIntegrationSettingsService settingsService;

  public MetaLeadWebhookController(
      MetaLeadProperties properties,
      MetaLeadService metaLeadService,
      MetaIntegrationSettingsService settingsService
  ) {
    this.properties = properties;
    this.metaLeadService = metaLeadService;
    this.settingsService = settingsService;
  }

  @GetMapping("/webhook")
  public ResponseEntity<String> verifyWebhook(
      @RequestParam(name = "hub.mode", required = false) String mode,
      @RequestParam(name = "hub.verify_token", required = false) String verifyToken,
      @RequestParam(name = "hub.challenge", required = false) String challenge
  ) {
    if (!"subscribe".equalsIgnoreCase(mode)) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Unsupported mode");
    }
    String resolvedToken = settingsService.resolveVerifyToken();
    if (resolvedToken != null && resolvedToken.equals(verifyToken)) {
      return ResponseEntity.ok(challenge != null ? challenge : "");
    }
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Invalid verify token");
  }

  @PostMapping("/webhook")
  public ResponseEntity<Void> receiveWebhook(
      @RequestBody String payload,
      @RequestHeader(name = "X-Hub-Signature-256", required = false) String signature
  ) {
    metaLeadService.handleWebhook(payload, signature);
    return ResponseEntity.ok().build();
  }

  @PostMapping("/fetch-latest")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public ResponseEntity<MetaLeadService.MetaLeadFetchResult> fetchLatest(
      @RequestParam(name = "limit", defaultValue = "25") int limit
  ) {
    return ResponseEntity.ok(metaLeadService.fetchLatestLeads(limit));
  }
}
