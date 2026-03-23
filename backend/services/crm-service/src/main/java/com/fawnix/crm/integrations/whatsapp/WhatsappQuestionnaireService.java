package com.fawnix.crm.integrations.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fawnix.crm.leads.dto.LeadDtos;
import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.leads.repository.LeadRepository;
import com.fawnix.crm.remarks.entity.LeadRemarkEntity;
import com.fawnix.crm.remarks.entity.LeadRemarkVersionEntity;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class WhatsappQuestionnaireService {

  private static final Logger LOGGER = LoggerFactory.getLogger(WhatsappQuestionnaireService.class);

  private static final String STEP_TEMPLATE_SENT = "TEMPLATE_SENT";
  private static final String STEP_ASK_LANGUAGE = "ASK_LANGUAGE";
  private static final String STEP_ASK_INTEREST = "ASK_INTEREST";
  private static final String STEP_ASK_DEMO = "ASK_DEMO";
  private static final String STEP_ASK_CALLBACK = "ASK_CALLBACK";
  private static final String STEP_ASK_CALLBACK_TIME = "ASK_CALLBACK_TIME";
  private static final String STEP_ASK_OWNERSHIP = "ASK_OWNERSHIP";
  private static final String STEP_COMPLETED = "COMPLETED";

  private static final List<String> INTEREST_OPTIONS = List.of(
      "Smart lighting control",
      "Complete home automation",
      "CCTV & Security",
      "Video door phone",
      "Smart locks"
  );

  private final WhatsappProperties properties;
  private final WhatsappIntegrationSettingsService settingsService;
  private final WhatsappClient whatsappClient;
  private final LeadWhatsappQuestionnaireRepository questionnaireRepository;
  private final LeadRepository leadRepository;
  private final ObjectMapper objectMapper;

  public WhatsappQuestionnaireService(
      WhatsappProperties properties,
      WhatsappClient whatsappClient,
      WhatsappIntegrationSettingsService settingsService,
      LeadWhatsappQuestionnaireRepository questionnaireRepository,
      LeadRepository leadRepository,
      ObjectMapper objectMapper
  ) {
    this.properties = properties;
    this.whatsappClient = whatsappClient;
    this.settingsService = settingsService;
    this.questionnaireRepository = questionnaireRepository;
    this.leadRepository = leadRepository;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public void sendIntro(LeadEntity lead) {
    if (!properties.enabled()) {
      return;
    }
    String phone = normalizePhone(lead.getPhone());
    if (!StringUtils.hasText(phone)) {
      return;
    }

    LeadWhatsappQuestionnaireEntity questionnaire = questionnaireRepository
        .findByLeadId(lead.getId())
        .orElseGet(() -> {
          LeadWhatsappQuestionnaireEntity created = new LeadWhatsappQuestionnaireEntity();
          created.setId(UUID.randomUUID().toString());
          created.setLead(lead);
          created.setPhone(phone);
          created.setStep(STEP_TEMPLATE_SENT);
          created.setCreatedAt(Instant.now());
          created.setUpdatedAt(Instant.now());
          return created;
        });
    questionnaire.setPhone(phone);

    if (lead.getWhatsappQuestionnaireSentAt() != null) {
      return;
    }

    String resolvedTemplateName = settingsService.resolveTemplateName();
    String templateName = StringUtils.hasText(resolvedTemplateName)
        ? resolvedTemplateName
        : "fawnix_lead_intro";
    String resolvedTemplateLanguage = settingsService.resolveTemplateLanguage();
    String languageCode = StringUtils.hasText(resolvedTemplateLanguage)
        ? resolvedTemplateLanguage
        : "en_US";

    List<String> bodyParams = settingsService.resolveTemplateUseLeadName()
        ? List.of(lead.getName())
        : List.of();

    try {
      String messageId = whatsappClient.sendTemplate(phone, templateName, languageCode, bodyParams);
      if (messageId == null && !bodyParams.isEmpty()) {
        messageId = whatsappClient.sendTemplate(phone, templateName, languageCode, List.of());
      }
      lead.setWhatsappQuestionnaireSentAt(Instant.now());
      questionnaire.setStep(STEP_TEMPLATE_SENT);
      questionnaire.setUpdatedAt(Instant.now());
      questionnaire.setLastMessageId(messageId);
      questionnaireRepository.save(questionnaire);
      leadRepository.save(lead);
      boolean templateAsksLanguage = "fawnix_lead_intro".equalsIgnoreCase(templateName);
      try {
        if (templateAsksLanguage) {
          questionnaire.setStep(STEP_ASK_LANGUAGE);
          questionnaire.setUpdatedAt(Instant.now());
          questionnaireRepository.save(questionnaire);
        } else {
          sendLanguageQuestion(questionnaire);
          questionnaire.setStep(STEP_ASK_LANGUAGE);
          questionnaire.setUpdatedAt(Instant.now());
          questionnaireRepository.save(questionnaire);
        }
      } catch (Exception ex) {
        LOGGER.warn("Failed to auto-start WhatsApp questionnaire for lead {}.", lead.getId(), ex);
      }
    } catch (Exception ex) {
      LOGGER.error("Failed to send WhatsApp template for lead {}.", lead.getId(), ex);
      questionnaire.setUpdatedAt(Instant.now());
      questionnaireRepository.save(questionnaire);
    }
  }

  public record DispatchResult(boolean sent, String reason) {
  }

  public DispatchResult sendAssignmentNotification(LeadEntity lead, String assigneeName, String assigneePhone) {
    if (!properties.enabled()) {
      return new DispatchResult(false, "whatsapp_disabled");
    }
    String phone = normalizePhone(assigneePhone);
    if (!StringUtils.hasText(phone)) {
      return new DispatchResult(false, "assignee_phone_missing");
    }

    String resolvedTemplateName = settingsService.resolveAssignTemplateName();
    String templateName = StringUtils.hasText(resolvedTemplateName)
        ? resolvedTemplateName
        : "assign_lead";
    String resolvedTemplateLanguage = settingsService.resolveAssignTemplateLanguage();
    String languageCode = StringUtils.hasText(resolvedTemplateLanguage)
        ? resolvedTemplateLanguage
        : "en_US";

    List<String> bodyParams = List.of(
        fallbackText(assigneeName, "Sales Executive"),
        fallbackText(lead.getName(), "New Lead"),
        fallbackText(resolveLeadContact(lead), "N/A"),
        fallbackText(resolveLeadRemarks(lead), "No remarks yet"),
        fallbackText(resolveLeadLocation(lead), "N/A")
    );

    try {
      whatsappClient.sendTemplate(phone, templateName, languageCode, bodyParams);
      return new DispatchResult(true, "sent");
    } catch (Exception ex) {
      LOGGER.error("Failed to send WhatsApp assignment template for lead {}.", lead.getId(), ex);
      return new DispatchResult(false, "send_failed");
    }
  }

  @Transactional(readOnly = true)
  public Optional<LeadDtos.LeadWhatsappQuestionnaireResponse> getQuestionnaire(String leadId) {
    return questionnaireRepository.findByLeadId(leadId)
        .map(this::toResponse);
  }

  public void handleWebhook(String payload, String signatureHeader) {
    if (!properties.enabled()) {
      LOGGER.debug("WhatsApp integration is disabled.");
      return;
    }

    if (!verifySignature(payload, signatureHeader)) {
      throw new IllegalArgumentException("Invalid WhatsApp webhook signature.");
    }

    JsonNode root;
    try {
      root = objectMapper.readTree(payload);
    } catch (Exception ex) {
      throw new IllegalArgumentException("Invalid WhatsApp webhook payload.", ex);
    }

    if (!"whatsapp_business_account".equalsIgnoreCase(root.path("object").asText())) {
      LOGGER.debug("Ignored WhatsApp webhook for object {}", root.path("object").asText());
      return;
    }

    for (JsonNode entry : root.path("entry")) {
      for (JsonNode change : entry.path("changes")) {
        if (!"messages".equalsIgnoreCase(change.path("field").asText())) {
          continue;
        }
        JsonNode value = change.path("value");
        JsonNode messages = value.path("messages");
        if (!messages.isArray()) {
          continue;
        }
        for (JsonNode message : messages) {
          handleInboundMessage(value, message);
        }
      }
    }
  }

  @Transactional
  protected void handleInboundMessage(JsonNode value, JsonNode message) {
    InboundMessage inbound = parseMessage(message);
    if (inbound == null || !StringUtils.hasText(inbound.from())) {
      return;
    }

    String phone = normalizePhone(inbound.from());
    if (!StringUtils.hasText(phone)) {
      return;
    }

    LeadWhatsappQuestionnaireEntity questionnaire = questionnaireRepository
        .findFirstByPhoneAndCompletedAtIsNullOrderByUpdatedAtDesc(phone)
        .orElse(null);
    if (questionnaire == null) {
      LOGGER.info("No active WhatsApp questionnaire for phone {}", phone);
      return;
    }

    String waId = extractWaId(value);
    if (StringUtils.hasText(waId) && !StringUtils.hasText(questionnaire.getWaId())) {
      questionnaire.setWaId(waId);
    }

    if (StringUtils.hasText(inbound.messageId())
        && inbound.messageId().equals(questionnaire.getLastMessageId())) {
      return;
    }

    questionnaire.setLastMessageId(inbound.messageId());
    questionnaire.setLastPayload(inbound.rawPayload());
    questionnaire.setUpdatedAt(Instant.now());

    advanceConversation(questionnaire, inbound);

    questionnaireRepository.save(questionnaire);
  }

  private void advanceConversation(LeadWhatsappQuestionnaireEntity questionnaire, InboundMessage inbound) {
    String step = StringUtils.hasText(questionnaire.getStep())
        ? questionnaire.getStep()
        : STEP_TEMPLATE_SENT;

    switch (step) {
      case STEP_TEMPLATE_SENT -> {
        sendLanguageQuestion(questionnaire);
        questionnaire.setStep(STEP_ASK_LANGUAGE);
      }
      case STEP_ASK_LANGUAGE -> {
        String language = parseLanguage(inbound);
        if (!StringUtils.hasText(language)) {
          resendLanguageQuestion(questionnaire);
          return;
        }
        questionnaire.setLanguage(language);
        sendInterestQuestion(questionnaire);
        questionnaire.setStep(STEP_ASK_INTEREST);
      }
      case STEP_ASK_INTEREST -> {
        String interests = parseInterest(inbound);
        if (!StringUtils.hasText(interests)) {
          resendInterestQuestion(questionnaire);
          return;
        }
        questionnaire.setInterestAreas(interests);
        sendDemoQuestion(questionnaire);
        questionnaire.setStep(STEP_ASK_DEMO);
      }
      case STEP_ASK_DEMO -> {
        String demo = parseDemoPreference(inbound);
        if (!StringUtils.hasText(demo)) {
          resendDemoQuestion(questionnaire);
          return;
        }
        questionnaire.setDemoPreference(demo);
        sendCallbackQuestion(questionnaire);
        questionnaire.setStep(STEP_ASK_CALLBACK);
      }
      case STEP_ASK_CALLBACK -> {
        String callback = parseCallbackPreference(inbound);
        if (!StringUtils.hasText(callback)) {
          resendCallbackQuestion(questionnaire);
          return;
        }
        questionnaire.setCallbackPreference(callback);
        if (callback.equalsIgnoreCase("Specific time")) {
          sendCallbackTimeQuestion(questionnaire);
          questionnaire.setStep(STEP_ASK_CALLBACK_TIME);
        } else {
          sendOwnershipQuestion(questionnaire);
          questionnaire.setStep(STEP_ASK_OWNERSHIP);
        }
      }
      case STEP_ASK_CALLBACK_TIME -> {
        String time = inbound.answerText();
        if (!StringUtils.hasText(time)) {
          sendCallbackTimeQuestion(questionnaire);
          return;
        }
        questionnaire.setCallbackTimeText(time.trim());
        sendOwnershipQuestion(questionnaire);
        questionnaire.setStep(STEP_ASK_OWNERSHIP);
      }
      case STEP_ASK_OWNERSHIP -> {
        String ownership = parseOwnership(inbound);
        if (!StringUtils.hasText(ownership)) {
          resendOwnershipQuestion(questionnaire);
          return;
        }
        questionnaire.setOwnershipRole(ownership);
        questionnaire.setCompletedAt(Instant.now());
        questionnaire.setStep(STEP_COMPLETED);
        sendCompletionMessage(questionnaire);
      }
      case STEP_COMPLETED -> LOGGER.debug("Questionnaire already completed for lead {}", questionnaire.getLead().getId());
      default -> {
        questionnaire.setStep(STEP_TEMPLATE_SENT);
        sendLanguageQuestion(questionnaire);
        questionnaire.setStep(STEP_ASK_LANGUAGE);
      }
    }
  }

  private void sendLanguageQuestion(LeadWhatsappQuestionnaireEntity questionnaire) {
    whatsappClient.sendButtons(
        questionnaire.getPhone(),
        "What is your preferred language?",
        List.of(
            new WhatsappClient.ButtonOption("lang_en", "English"),
            new WhatsappClient.ButtonOption("lang_te", "Telugu"),
            new WhatsappClient.ButtonOption("lang_hi", "Hindi")
        )
    );
  }

  private void resendLanguageQuestion(LeadWhatsappQuestionnaireEntity questionnaire) {
    whatsappClient.sendText(questionnaire.getPhone(), "Please choose a language using the buttons below.");
    sendLanguageQuestion(questionnaire);
  }

  private void sendInterestQuestion(LeadWhatsappQuestionnaireEntity questionnaire) {
    StringBuilder builder = new StringBuilder();
    builder.append("Great! What solutions are you mainly interested in? Reply with numbers (comma-separated for multiple):\n");
    for (int i = 0; i < INTEREST_OPTIONS.size(); i++) {
      builder.append(i + 1).append(". ").append(INTEREST_OPTIONS.get(i)).append("\n");
    }
    whatsappClient.sendText(questionnaire.getPhone(), builder.toString().trim());
  }

  private void resendInterestQuestion(LeadWhatsappQuestionnaireEntity questionnaire) {
    whatsappClient.sendText(questionnaire.getPhone(), "Please reply with the option numbers, for example 1,3.");
    sendInterestQuestion(questionnaire);
  }

  private void sendDemoQuestion(LeadWhatsappQuestionnaireEntity questionnaire) {
    whatsappClient.sendButtons(
        questionnaire.getPhone(),
        "Would you like a demo?",
        List.of(
            new WhatsappClient.ButtonOption("demo_office", "Visit office"),
            new WhatsappClient.ButtonOption("demo_home", "Home demo"),
            new WhatsappClient.ButtonOption("demo_call", "Prefer call")
        )
    );
  }

  private void resendDemoQuestion(LeadWhatsappQuestionnaireEntity questionnaire) {
    whatsappClient.sendText(questionnaire.getPhone(), "Please choose one demo option using the buttons.");
    sendDemoQuestion(questionnaire);
  }

  private void sendCallbackQuestion(LeadWhatsappQuestionnaireEntity questionnaire) {
    whatsappClient.sendList(
        questionnaire.getPhone(),
        "When should our automation expert call you?",
        "Choose",
        List.of(
            new WhatsappClient.ListOption("callback_today", "Today", null),
            new WhatsappClient.ListOption("callback_tomorrow", "Tomorrow", null),
            new WhatsappClient.ListOption("callback_weekend", "Weekend", null),
            new WhatsappClient.ListOption("callback_specific", "Choose specific time", null)
        )
    );
  }

  private void resendCallbackQuestion(LeadWhatsappQuestionnaireEntity questionnaire) {
    whatsappClient.sendText(questionnaire.getPhone(), "Please choose a callback option from the list.");
    sendCallbackQuestion(questionnaire);
  }

  private void sendCallbackTimeQuestion(LeadWhatsappQuestionnaireEntity questionnaire) {
    whatsappClient.sendText(
        questionnaire.getPhone(),
        "Please share a convenient time for a callback (e.g. 10am-1pm, 1pm-4pm, 4pm-6pm)."
    );
  }

  private void sendOwnershipQuestion(LeadWhatsappQuestionnaireEntity questionnaire) {
    whatsappClient.sendList(
        questionnaire.getPhone(),
        "May I know if you are the home owner or an interior designer/architect?",
        "Choose",
        List.of(
            new WhatsappClient.ListOption("owner_home", "Home owner", null),
            new WhatsappClient.ListOption("owner_designer", "Interior designer", null),
            new WhatsappClient.ListOption("owner_architect", "Architect", null),
            new WhatsappClient.ListOption("owner_builder", "Builder", null)
        )
    );
  }

  private void resendOwnershipQuestion(LeadWhatsappQuestionnaireEntity questionnaire) {
    whatsappClient.sendText(questionnaire.getPhone(), "Please select one ownership option from the list.");
    sendOwnershipQuestion(questionnaire);
  }

  private void sendCompletionMessage(LeadWhatsappQuestionnaireEntity questionnaire) {
    whatsappClient.sendText(
        questionnaire.getPhone(),
        "Perfect! Our Iotiq automation specialist will contact you shortly. If possible, please keep your floorplan/electric layout ready so we can guide you better."
    );
  }

  private String parseLanguage(InboundMessage inbound) {
    String id = inbound.interactiveId();
    if (StringUtils.hasText(id)) {
      return switch (id) {
        case "lang_en" -> "English";
        case "lang_te" -> "Telugu";
        case "lang_hi" -> "Hindi";
        default -> null;
      };
    }

    String text = inbound.answerTextLower();
    if (text.contains("telugu")) {
      return "Telugu";
    }
    if (text.contains("hindi")) {
      return "Hindi";
    }
    if (text.contains("english") || text.equals("en") || text.contains("en_us")) {
      return "English";
    }
    return null;
  }

  private String parseInterest(InboundMessage inbound) {
    String text = inbound.answerText();
    if (!StringUtils.hasText(text)) {
      return null;
    }
    List<Integer> indices = Arrays.stream(text.split("[^0-9]+"))
        .filter(StringUtils::hasText)
        .map(value -> {
          try {
            return Integer.parseInt(value);
          } catch (NumberFormatException ex) {
            return null;
          }
        })
        .filter(value -> value != null && value >= 1 && value <= INTEREST_OPTIONS.size())
        .distinct()
        .toList();

    List<String> interests = new ArrayList<>();
    for (Integer index : indices) {
      interests.add(INTEREST_OPTIONS.get(index - 1));
    }

    if (interests.isEmpty()) {
      String lower = text.toLowerCase(Locale.ROOT);
      for (String option : INTEREST_OPTIONS) {
        String key = option.toLowerCase(Locale.ROOT);
        if (lower.contains(key.substring(0, Math.min(6, key.length())))) {
          interests.add(option);
        }
      }
    }

    if (interests.isEmpty()) {
      return text.trim();
    }

    return String.join(", ", interests);
  }

  private String parseDemoPreference(InboundMessage inbound) {
    String id = inbound.interactiveId();
    if (StringUtils.hasText(id)) {
      return switch (id) {
        case "demo_office" -> "Visit office";
        case "demo_home" -> "Home demo";
        case "demo_call" -> "Prefer call";
        default -> null;
      };
    }

    String text = inbound.answerTextLower();
    if (text.contains("office")) {
      return "Visit office";
    }
    if (text.contains("home")) {
      return "Home demo";
    }
    if (text.contains("call")) {
      return "Prefer call";
    }
    return null;
  }

  private String parseCallbackPreference(InboundMessage inbound) {
    String id = inbound.interactiveId();
    if (StringUtils.hasText(id)) {
      return switch (id) {
        case "callback_today" -> "Today";
        case "callback_tomorrow" -> "Tomorrow";
        case "callback_weekend" -> "Weekend";
        case "callback_specific" -> "Specific time";
        default -> null;
      };
    }

    String text = inbound.answerTextLower();
    if (text.contains("today")) {
      return "Today";
    }
    if (text.contains("tomorrow")) {
      return "Tomorrow";
    }
    if (text.contains("weekend")) {
      return "Weekend";
    }
    if (text.contains("specific") || text.contains("time")) {
      return "Specific time";
    }
    return null;
  }

  private String parseOwnership(InboundMessage inbound) {
    String id = inbound.interactiveId();
    if (StringUtils.hasText(id)) {
      return switch (id) {
        case "owner_home" -> "Home owner";
        case "owner_designer" -> "Interior designer";
        case "owner_architect" -> "Architect";
        case "owner_builder" -> "Builder";
        default -> null;
      };
    }

    String text = inbound.answerTextLower();
    if (text.contains("home")) {
      return "Home owner";
    }
    if (text.contains("designer")) {
      return "Interior designer";
    }
    if (text.contains("architect")) {
      return "Architect";
    }
    if (text.contains("builder")) {
      return "Builder";
    }
    return null;
  }

  private InboundMessage parseMessage(JsonNode message) {
    String from = message.path("from").asText(null);
    if (!StringUtils.hasText(from)) {
      return null;
    }

    String messageId = message.path("id").asText(null);
    String type = message.path("type").asText(null);
    String text = null;
    String interactiveId = null;
    String interactiveTitle = null;

    if ("text".equals(type)) {
      text = message.path("text").path("body").asText(null);
    } else if ("button".equals(type)) {
      text = message.path("button").path("text").asText(null);
      interactiveId = message.path("button").path("payload").asText(null);
    } else if ("interactive".equals(type)) {
      JsonNode interactive = message.path("interactive");
      String interactiveType = interactive.path("type").asText(null);
      if ("button_reply".equals(interactiveType)) {
        interactiveId = interactive.path("button_reply").path("id").asText(null);
        interactiveTitle = interactive.path("button_reply").path("title").asText(null);
      } else if ("list_reply".equals(interactiveType)) {
        interactiveId = interactive.path("list_reply").path("id").asText(null);
        interactiveTitle = interactive.path("list_reply").path("title").asText(null);
      }
    }

    String rawPayload = message.toString();

    return new InboundMessage(from, messageId, type, text, interactiveId, interactiveTitle, rawPayload);
  }

  private String extractWaId(JsonNode value) {
    JsonNode contacts = value.path("contacts");
    if (!contacts.isArray() || contacts.isEmpty()) {
      return null;
    }
    return contacts.get(0).path("wa_id").asText(null);
  }

  private boolean verifySignature(String payload, String signatureHeader) {
    String secret = settingsService.resolveAppSecret();
    if (!StringUtils.hasText(secret)) {
      return true;
    }
    if (!StringUtils.hasText(signatureHeader) || !signatureHeader.startsWith("sha256=")) {
      LOGGER.warn("Missing WhatsApp webhook signature.");
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
      LOGGER.error("Failed to verify WhatsApp webhook signature.", ex);
      return false;
    }
  }

  private String normalizePhone(String phone) {
    if (!StringUtils.hasText(phone)) {
      return null;
    }
    String digits = phone.replaceAll("\\D", "");
    if (!StringUtils.hasText(digits)) {
      return null;
    }
    String countryCode = settingsService.resolveDefaultCountryCode();
    if (digits.length() == 10 && StringUtils.hasText(countryCode)) {
      String normalizedCountry = countryCode.replaceAll("\\D", "");
      if (StringUtils.hasText(normalizedCountry)) {
        return normalizedCountry + digits;
      }
    }
    return digits;
  }

  private String resolveLeadContact(LeadEntity lead) {
    if (StringUtils.hasText(lead.getPhone())) {
      return lead.getPhone();
    }
    if (StringUtils.hasText(lead.getAlternativePhone())) {
      return lead.getAlternativePhone();
    }
    if (StringUtils.hasText(lead.getEmail())) {
      return lead.getEmail();
    }
    return null;
  }

  private String resolveLeadRemarks(LeadEntity lead) {
    if (StringUtils.hasText(lead.getPresalesRemarks())) {
      return lead.getPresalesRemarks();
    }
    for (LeadRemarkEntity remark : lead.getRemarks()) {
      List<LeadRemarkVersionEntity> versions = remark.getVersions();
      if (versions == null || versions.isEmpty()) {
        continue;
      }
      LeadRemarkVersionEntity latest = versions.get(versions.size() - 1);
      if (latest != null && StringUtils.hasText(latest.getContent())) {
        return latest.getContent();
      }
    }
    return lead.getNotes();
  }

  private String resolveLeadLocation(LeadEntity lead) {
    String location = joinNonBlank(
        ", ",
        lead.getProjectLocation(),
        lead.getProjectState(),
        lead.getCommunity()
    );
    if (StringUtils.hasText(location)) {
      return location;
    }
    return lead.getCompany();
  }

  private String joinNonBlank(String delimiter, String... values) {
    StringBuilder builder = new StringBuilder();
    for (String value : values) {
      if (!StringUtils.hasText(value)) {
        continue;
      }
      if (builder.length() > 0) {
        builder.append(delimiter);
      }
      builder.append(value.trim());
    }
    return builder.toString();
  }

  private String fallbackText(String value, String fallback) {
    if (!StringUtils.hasText(value)) {
      return fallback;
    }
    return value.trim();
  }

  private LeadDtos.LeadWhatsappQuestionnaireResponse toResponse(LeadWhatsappQuestionnaireEntity entity) {
    List<String> interests = new ArrayList<>();
    if (StringUtils.hasText(entity.getInterestAreas())) {
      interests = Arrays.stream(entity.getInterestAreas().split(","))
          .map(String::trim)
          .filter(StringUtils::hasText)
          .toList();
    }

    return new LeadDtos.LeadWhatsappQuestionnaireResponse(
        entity.getId(),
        entity.getLead().getId(),
        entity.getPhone(),
        entity.getWaId(),
        entity.getLanguage(),
        interests,
        entity.getDemoPreference(),
        entity.getCallbackPreference(),
        entity.getCallbackTimeText(),
        entity.getOwnershipRole(),
        entity.getStep(),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        entity.getCompletedAt()
    );
  }

  private record InboundMessage(
      String from,
      String messageId,
      String type,
      String text,
      String interactiveId,
      String interactiveTitle,
      String rawPayload
  ) {
    String answerText() {
      if (StringUtils.hasText(interactiveTitle)) {
        return interactiveTitle;
      }
      return text;
    }

    String answerTextLower() {
      String answer = answerText();
      return answer == null ? "" : answer.toLowerCase(Locale.ROOT);
    }
  }
}
