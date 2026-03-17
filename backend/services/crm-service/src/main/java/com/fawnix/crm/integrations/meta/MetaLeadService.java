package com.fawnix.crm.integrations.meta;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fawnix.crm.common.exception.BadRequestException;
import com.fawnix.crm.leads.dto.LeadDtos;
import com.fawnix.crm.leads.entity.LeadPriority;
import com.fawnix.crm.leads.entity.LeadSource;
import com.fawnix.crm.leads.entity.LeadStatus;
import com.fawnix.crm.leads.service.LeadService;
import com.fawnix.crm.leads.validator.LeadRequestValidator;
import com.fawnix.crm.security.service.AppUserDetails;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class MetaLeadService {

  private static final Logger LOGGER = LoggerFactory.getLogger(MetaLeadService.class);
  private static final AppUserDetails SYSTEM_ACTOR = new AppUserDetails(
      "system-meta",
      "meta@fawnix.local",
      "Meta Lead",
      List.of("ROLE_ADMIN"),
      List.of()
  );

  private final MetaLeadProperties properties;
  private final MetaLeadClient metaLeadClient;
  private final MetaLeadIngestionRepository ingestionRepository;
  private final LeadService leadService;
  private final LeadRequestValidator leadRequestValidator;
  private final ObjectMapper objectMapper;
  private final MetaIntegrationSettingsService settingsService;

  public MetaLeadService(
      MetaLeadProperties properties,
      MetaLeadClient metaLeadClient,
      MetaLeadIngestionRepository ingestionRepository,
      LeadService leadService,
      LeadRequestValidator leadRequestValidator,
      ObjectMapper objectMapper,
      MetaIntegrationSettingsService settingsService
  ) {
    this.properties = properties;
    this.metaLeadClient = metaLeadClient;
    this.ingestionRepository = ingestionRepository;
    this.leadService = leadService;
    this.leadRequestValidator = leadRequestValidator;
    this.objectMapper = objectMapper;
    this.settingsService = settingsService;
  }

  public void handleWebhook(String payload, String signatureHeader) {
    if (!properties.enabled()) {
      LOGGER.debug("Meta lead integration is disabled.");
      return;
    }

    if (!verifySignature(payload, signatureHeader)) {
      throw new IllegalArgumentException("Invalid Meta webhook signature.");
    }

    JsonNode root;
    try {
      root = objectMapper.readTree(payload);
    } catch (Exception ex) {
      throw new IllegalArgumentException("Invalid webhook payload.", ex);
    }

    if (!"page".equalsIgnoreCase(root.path("object").asText())) {
      LOGGER.debug("Ignored Meta webhook for object {}", root.path("object").asText());
      return;
    }

    for (JsonNode entry : root.path("entry")) {
      String pageId = entry.path("id").asText(null);
      for (JsonNode change : entry.path("changes")) {
        if (!"leadgen".equalsIgnoreCase(change.path("field").asText())) {
          continue;
        }
        JsonNode value = change.path("value");
        String leadgenId = value.path("leadgen_id").asText(null);
        if (!StringUtils.hasText(leadgenId)) {
          continue;
        }
        if (ingestionRepository.existsByLeadgenId(leadgenId)) {
          LOGGER.info("Meta lead {} already processed, skipping.", leadgenId);
          continue;
        }
        processLeadgen(leadgenId, pageId, value.path("form_id").asText(null), value.path("ad_id").asText(null));
      }
    }
  }

  public MetaLeadFetchResult fetchLatestLeads(int limit) {
    String accessToken = settingsService.resolveAccessToken();
    if (!StringUtils.hasText(accessToken)) {
      throw new BadRequestException("Meta access token is required to fetch leads.");
    }
    String formId = settingsService.resolveFormId();
    if (!StringUtils.hasText(formId)) {
      throw new BadRequestException("Meta form ID is required to fetch leads.");
    }

    MetaLeadClient.MetaLeadPage page = metaLeadClient.fetchFormLeads(formId, null, limit);
    int created = 0;
    int skipped = 0;

    for (MetaLeadClient.MetaLeadDetails details : page.leads()) {
      if (details.leadgenId() == null || details.leadgenId().isBlank()) {
        skipped++;
        continue;
      }
      if (ingestionRepository.existsByLeadgenId(details.leadgenId())) {
        skipped++;
        continue;
      }
      processLeadDetails(details, null, details.formId(), details.adId());
      created++;
    }

    return new MetaLeadFetchResult(page.leads().size(), created, skipped, page.nextCursor());
  }

  private void processLeadgen(String leadgenId, String pageId, String formId, String adId) {
    String configuredFormId = settingsService.resolveFormId();
    if (StringUtils.hasText(configuredFormId)
        && StringUtils.hasText(formId)
        && !configuredFormId.equals(formId)) {
      LOGGER.info("Skipping Meta lead {} for form {} (configured {}).", leadgenId, formId, configuredFormId);
      return;
    }

    MetaLeadClient.MetaLeadDetails details = metaLeadClient.fetchLead(leadgenId);
    if (StringUtils.hasText(configuredFormId)
        && StringUtils.hasText(details.formId())
        && !configuredFormId.equals(details.formId())) {
      LOGGER.info("Skipping Meta lead {} fetched from form {} (configured {}).", leadgenId, details.formId(), configuredFormId);
      return;
    }
    processLeadDetails(details, pageId, formId, adId);
  }

  private void processLeadDetails(MetaLeadClient.MetaLeadDetails details, String pageId, String formId, String adId) {
    LeadDtos.CreateLeadRequest request = buildLeadRequest(details);
    var created = leadService.createLead(request, SYSTEM_ACTOR);

    MetaLeadIngestionEntity ingestion = new MetaLeadIngestionEntity();
    ingestion.setId(UUID.randomUUID().toString());
    ingestion.setLeadgenId(details.leadgenId());
    ingestion.setLeadId(created.id());
    ingestion.setPageId(pageId);
    ingestion.setFormId(formId != null ? formId : details.formId());
    ingestion.setAdId(adId != null ? adId : details.adId());
    ingestion.setPayload(details.rawPayload());
    ingestion.setCreatedAt(Instant.now());
    ingestion.setProcessedAt(Instant.now());
    ingestionRepository.save(ingestion);
  }

  private LeadDtos.CreateLeadRequest buildLeadRequest(MetaLeadClient.MetaLeadDetails details) {
    Map<String, List<String>> fields = details.fieldData();
    String fullName = firstValue(fields, "full_name", "full name");
    String firstName = firstValue(fields, "first_name", "first name");
    String lastName = firstValue(fields, "last_name", "last name");
    if (!StringUtils.hasText(fullName)) {
      fullName = String.join(" ", safe(firstName), safe(lastName)).trim();
    }
    if (!StringUtils.hasText(fullName)) {
      fullName = "Meta Lead";
    }

    String company = firstValue(fields, "company", "company_name", "business_name");
    if (!StringUtils.hasText(company)) {
      company = "Meta Lead";
    }

    String email = firstValue(fields, "email", "email_address");
    String phone = firstValue(fields, "phone_number", "phone");
    String projectLocation = firstValue(fields, "location_of_the_property?", "location_of_the_property", "location");
    String expectedTimeline = firstValue(fields, "how_soon_do_you_wish_to_automate_your_home?", "expected_timeline");
    String propertyType = firstValue(fields, "property_type?", "property_type");

    LeadStatus status = leadRequestValidator.parseStatus(
        defaultOr(properties.defaultStatus(), LeadStatus.NEW.name())
    );
    LeadPriority priority = leadRequestValidator.parsePriority(
        defaultOr(properties.defaultPriority(), LeadPriority.MEDIUM.name())
    );
    LeadSource source = leadRequestValidator.parseSource(
        defaultOr(properties.defaultSource(), LeadSource.SOCIAL.name())
    );

    List<String> tags = new ArrayList<>();
    String defaultTags = properties.defaultTags();
    if (StringUtils.hasText(defaultTags)) {
      for (String tag : defaultTags.split(",")) {
        String trimmed = tag.trim();
        if (!trimmed.isEmpty()) {
          tags.add(trimmed);
        }
      }
    } else {
      tags.add("meta");
    }

    String notes = buildNotes(details);

    if (!StringUtils.hasText(company)) {
      company = firstNonBlank(projectLocation, propertyType, "Meta Lead");
    }

    return new LeadDtos.CreateLeadRequest(
        fullName,
        company,
        email,
        phone,
        source.name(),
        status.name(),
        priority.name(),
        null,
        null,
        null,
        notes,
        tags,
        null,
        null,
        null,
        null,
        null,
        null,
        expectedTimeline,
        propertyType,
        null,
        null,
        projectLocation,
        null,
        null,
        null,
        null,
        null,
        null,
        details.leadgenId(),
        details.formId(),
        details.adId(),
        details.createdTime()
    );
  }

  private String buildNotes(MetaLeadClient.MetaLeadDetails details) {
    StringBuilder builder = new StringBuilder();
    builder.append("Meta lead captured.");
    builder.append(" Leadgen ID: ").append(details.leadgenId()).append(".");
    if (details.formId() != null) {
      builder.append(" Form ID: ").append(details.formId()).append(".");
    }
    if (details.adId() != null) {
      builder.append(" Ad ID: ").append(details.adId()).append(".");
    }
    if (details.createdTime() != null) {
      builder.append(" Created: ").append(details.createdTime()).append(".");
    }
    return builder.toString();
  }

  public record MetaLeadFetchResult(
      int processed,
      int created,
      int skipped,
      String nextCursor
  ) {
  }

  private boolean verifySignature(String payload, String signatureHeader) {
    String secret = settingsService.resolveAppSecret();
    if (!StringUtils.hasText(secret)) {
      return true;
    }
    if (!StringUtils.hasText(signatureHeader) || !signatureHeader.startsWith("sha256=")) {
      LOGGER.warn("Missing Meta webhook signature.");
      return false;
    }
    String expected = signatureHeader.substring("sha256=".length()).toLowerCase(Locale.ROOT);
    try {
      Mac hmac = Mac.getInstance("HmacSHA256");
      hmac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] digest = hmac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
      StringBuilder actual = new StringBuilder();
      for (byte b : digest) {
        actual.append(String.format("%02x", b));
      }
      return expected.equals(actual.toString());
    } catch (Exception ex) {
      LOGGER.error("Failed to verify Meta webhook signature.", ex);
      return false;
    }
  }

  private String firstValue(Map<String, List<String>> fields, String... keys) {
    for (String key : keys) {
      List<String> values = fields.get(key);
      if (values != null && !values.isEmpty() && StringUtils.hasText(values.get(0))) {
        return values.get(0);
      }
      String normalized = key.toLowerCase(Locale.ROOT);
      for (Map.Entry<String, List<String>> entry : fields.entrySet()) {
        if (entry.getKey() != null && entry.getKey().toLowerCase(Locale.ROOT).equals(normalized)) {
          List<String> altValues = entry.getValue();
          if (altValues != null && !altValues.isEmpty() && StringUtils.hasText(altValues.get(0))) {
            return altValues.get(0);
          }
        }
      }
    }
    return null;
  }

  private String safe(String value) {
    return value == null ? "" : value;
  }

  private String firstNonBlank(String... values) {
    for (String value : values) {
      if (StringUtils.hasText(value)) {
        return value.trim();
      }
    }
    return null;
  }

  private String defaultOr(String value, String fallback) {
    return StringUtils.hasText(value) ? value : fallback;
  }
}
