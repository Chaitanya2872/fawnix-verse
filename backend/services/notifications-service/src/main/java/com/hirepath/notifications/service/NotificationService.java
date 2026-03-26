package com.hirepath.notifications.service;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hirepath.notifications.config.NotificationProperties;
import com.hirepath.notifications.domain.Notification;
import com.hirepath.notifications.domain.NotificationChannel;
import com.hirepath.notifications.domain.NotificationOutbox;
import com.hirepath.notifications.domain.NotificationOutboxStatus;
import com.hirepath.notifications.domain.NotificationPreference;
import com.hirepath.notifications.domain.NotificationPriority;
import com.hirepath.notifications.domain.NotificationRecipient;
import com.hirepath.notifications.domain.NotificationRecipientStatus;
import com.hirepath.notifications.domain.NotificationTemplate;
import com.hirepath.notifications.dto.PreferenceItemRequest;
import com.hirepath.notifications.dto.PreferencesRequest;
import com.hirepath.notifications.dto.RecipientTargetRequest;
import com.hirepath.notifications.dto.SendNotificationRequest;
import com.hirepath.notifications.dto.TemplateUpsertRequest;
import com.hirepath.notifications.dto.WebPushSubscriptionRequest;
import com.hirepath.notifications.repository.NotificationOutboxRepository;
import com.hirepath.notifications.repository.NotificationPreferenceRepository;
import com.hirepath.notifications.repository.NotificationRecipientRepository;
import com.hirepath.notifications.repository.NotificationRepository;
import com.hirepath.notifications.repository.NotificationSubscriptionRepository;
import com.hirepath.notifications.repository.NotificationTemplateRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final NotificationRecipientRepository recipientRepository;
    private final NotificationOutboxRepository outboxRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final NotificationTemplateRepository templateRepository;
    private final NotificationSubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;
    private final NotificationProperties properties;
    private final NotificationSseHub sseHub;
    private final TemplateResolver templateResolver;

    public NotificationService(
        NotificationRepository notificationRepository,
        NotificationRecipientRepository recipientRepository,
        NotificationOutboxRepository outboxRepository,
        NotificationPreferenceRepository preferenceRepository,
        NotificationTemplateRepository templateRepository,
        NotificationSubscriptionRepository subscriptionRepository,
        ObjectMapper objectMapper,
        StringRedisTemplate redisTemplate,
        NotificationProperties properties,
        NotificationSseHub sseHub,
        TemplateResolver templateResolver
    ) {
        this.notificationRepository = notificationRepository;
        this.recipientRepository = recipientRepository;
        this.outboxRepository = outboxRepository;
        this.preferenceRepository = preferenceRepository;
        this.templateRepository = templateRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
        this.properties = properties;
        this.sseHub = sseHub;
        this.templateResolver = templateResolver;
    }

    @Transactional
    public SendResult send(SendNotificationRequest request) {
        validateRequest(request);

        Notification existing = findIdempotent(request);
        if (existing != null) {
            return new SendResult(existing.getId(), true, List.of());
        }

        Notification notification = new Notification();
        notification.setTenantId(request.getTenantId());
        notification.setModule(normalizeModule(request.getModule()));
        notification.setEventType(request.getEventType().trim());
        if (request.getContent() != null) {
            notification.setTitle(request.getContent().getTitle());
            notification.setBodyText(request.getContent().getBodyText());
            notification.setBodyHtml(request.getContent().getBodyHtml());
        }
        notification.setTemplateKey(normalizeBlank(request.getTemplateKey()));
        notification.setTemplateVariables(writeVariables(request.getVariables()));
        notification.setDeeplinkUrl(normalizeBlank(request.getDeeplinkUrl()));
        notification.setPriority(parsePriority(request.getPriority()));
        notification.setIdempotencyKey(normalizeBlank(request.getIdempotencyKey()));
        notification.setLocale(normalizeBlank(request.getLocale()));

        if (notification.getTemplateKey() != null && notification.getTitle() == null && notification.getBodyText() == null && notification.getBodyHtml() == null) {
            try {
                RenderedTemplate rendered = templateResolver.resolve(notification, NotificationChannel.IN_APP);
                notification.setTitle(rendered.getSubject());
                notification.setBodyText(rendered.getTextBody());
                notification.setBodyHtml(rendered.getHtmlBody());
            } catch (IllegalArgumentException ex) {
                // defer validation to sender for channel-specific templates
            }
        }

        Notification saved = notificationRepository.save(notification);

        List<NotificationChannel> channels = parseChannels(request.getChannels());
        List<UUID> recipientIds = new ArrayList<>();

        for (RecipientTargetRequest target : request.getRecipients()) {
            NotificationRecipient recipient = new NotificationRecipient();
            recipient.setNotification(saved);
            recipient.setUserId(parseUserId(target.getUserId()));
            recipient.setEmail(normalizeBlank(target.getEmail()));

            List<NotificationChannel> effectiveChannels = applyPreferences(recipient.getUserId(), channels);
            List<NotificationChannel> eligibleChannels = new ArrayList<>();
            for (NotificationChannel channel : effectiveChannels) {
                if (channel == NotificationChannel.IN_APP && recipient.getUserId() == null) {
                    continue;
                }
                if (channel == NotificationChannel.EMAIL && (recipient.getEmail() == null || recipient.getEmail().isBlank())) {
                    continue;
                }
                if (channel == NotificationChannel.WEB_PUSH && recipient.getUserId() == null) {
                    continue;
                }
                eligibleChannels.add(channel);
            }
            if (eligibleChannels.isEmpty()) {
                recipient.setChannels("");
                recipient.setStatus(NotificationRecipientStatus.FAILED);
                recipientRepository.save(recipient);
                continue;
            }
            recipient.setChannels(joinChannels(eligibleChannels));
            recipient.setStatus(NotificationRecipientStatus.PENDING);
            NotificationRecipient stored = recipientRepository.save(recipient);
            recipientIds.add(stored.getId());

            for (NotificationChannel channel : eligibleChannels) {
                NotificationOutbox outbox = new NotificationOutbox();
                outbox.setNotification(saved);
                outbox.setRecipient(stored);
                outbox.setChannel(channel);
                outbox.setStatus(NotificationOutboxStatus.PENDING);
                OffsetDateTime nextRetry = computeQuietHourDelay(recipient.getUserId(), channel);
                outbox.setNextRetryAt(nextRetry);
                NotificationOutbox savedOutbox = outboxRepository.save(outbox);
                enqueueOutbox(savedOutbox);
            }

            if (recipient.getUserId() != null && eligibleChannels.contains(NotificationChannel.IN_APP)) {
                Map<String, Object> payload = new HashMap<>();
                payload.put("recipient_id", stored.getId());
                payload.put("notification_id", saved.getId());
                payload.put("title", saved.getTitle());
                payload.put("module", saved.getModule());
                payload.put("event_type", saved.getEventType());
                sseHub.emit(recipient.getUserId(), payload);
            }
        }

        return new SendResult(saved.getId(), false, recipientIds);
    }

    public List<Map<String, Object>> inbox(UUID userId, String module, Boolean unreadOnly) {
        List<NotificationRecipient> recipients = recipientRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Map<String, Object>> data = new ArrayList<>();
        for (NotificationRecipient recipient : recipients) {
            Notification notification = recipient.getNotification();
            if (module != null && !module.isBlank()) {
                if (!module.equalsIgnoreCase(notification.getModule())) {
                    continue;
                }
            }
            if (recipient.getChannels() == null || !recipient.getChannels().contains("in_app")) {
                continue;
            }
            if (Boolean.TRUE.equals(unreadOnly) && recipient.getStatus() == NotificationRecipientStatus.READ) {
                continue;
            }
            Map<String, Object> row = new HashMap<>();
            row.put("recipient_id", recipient.getId());
            row.put("notification_id", notification.getId());
            row.put("title", notification.getTitle());
            row.put("body_text", notification.getBodyText());
            row.put("body_html", notification.getBodyHtml());
            row.put("module", notification.getModule());
            row.put("event_type", notification.getEventType());
            row.put("deeplink_url", notification.getDeeplinkUrl());
            row.put("priority", notification.getPriority().name().toLowerCase());
            row.put("status", recipient.getStatus().name().toLowerCase());
            row.put("read_at", recipient.getReadAt());
            row.put("created_at", recipient.getCreatedAt());
            data.add(row);
        }
        return data;
    }

    public boolean markRead(UUID userId, UUID recipientId) {
        NotificationRecipient recipient = recipientRepository.findById(recipientId).orElse(null);
        if (recipient == null || recipient.getUserId() == null || !recipient.getUserId().equals(userId)) {
            return false;
        }
        recipient.setStatus(NotificationRecipientStatus.READ);
        recipient.setReadAt(OffsetDateTime.now());
        recipientRepository.save(recipient);
        return true;
    }

    public int markReadAll(UUID userId) {
        List<NotificationRecipient> recipients = recipientRepository.findByUserIdOrderByCreatedAtDesc(userId);
        int count = 0;
        for (NotificationRecipient recipient : recipients) {
            if (recipient.getStatus() != NotificationRecipientStatus.READ) {
                recipient.setStatus(NotificationRecipientStatus.READ);
                recipient.setReadAt(OffsetDateTime.now());
                count++;
            }
        }
        recipientRepository.saveAll(recipients);
        return count;
    }

    public void updatePreferences(UUID userId, PreferencesRequest request) {
        if (request == null || request.getPreferences() == null) {
            return;
        }
        for (PreferenceItemRequest pref : request.getPreferences()) {
            NotificationChannel channel = parseChannel(pref.getChannel());
            if (channel == null) {
                continue;
            }
            NotificationPreference entity = preferenceRepository.findByUserIdAndChannel(userId, channel)
                .orElseGet(NotificationPreference::new);
            entity.setUserId(userId);
            entity.setChannel(channel);
            entity.setEnabled(pref.isEnabled());
            entity.setQuietHoursStart(normalizeBlank(pref.getQuietHoursStart()));
            entity.setQuietHoursEnd(normalizeBlank(pref.getQuietHoursEnd()));
            entity.setLocale(normalizeBlank(pref.getLocale()));
            preferenceRepository.save(entity);
        }
    }

    public NotificationTemplate upsertTemplate(TemplateUpsertRequest request) {
        if (request == null || request.getKey() == null || request.getKey().isBlank()) {
            throw new IllegalArgumentException("key is required");
        }
        NotificationChannel channel = parseChannel(request.getChannel());
        if (channel == null) {
            throw new IllegalArgumentException("Invalid channel");
        }
        NotificationTemplate template = new NotificationTemplate();
        template.setKey(request.getKey());
        template.setChannel(channel);
        template.setSubject(request.getSubject());
        template.setHtmlBody(request.getHtmlBody());
        template.setTextBody(request.getTextBody());
        template.setVariablesSchema(writeSchema(request.getVariablesSchema()));
        template.setLocale(normalizeBlank(request.getLocale()));
        int version = request.getVersion() != null ? request.getVersion() : nextVersion(request.getKey(), channel, template.getLocale());
        template.setVersion(version);
        return templateRepository.save(template);
    }

    public NotificationTemplate getTemplate(String key, String channel, String locale) {
        NotificationChannel parsed = parseChannel(channel);
        if (parsed == null) {
            return null;
        }
        if (locale != null && !locale.isBlank()) {
            return templateRepository.findTopByKeyAndChannelAndLocaleOrderByVersionDesc(key, parsed, locale).orElse(null);
        }
        return templateRepository.findTopByKeyAndChannelOrderByVersionDesc(key, parsed).orElse(null);
    }

    public void upsertSubscription(UUID userId, WebPushSubscriptionRequest request) {
        if (request == null || request.getEndpoint() == null || request.getEndpoint().isBlank()) {
            return;
        }
        var existing = subscriptionRepository.findByUserIdAndEndpoint(userId, request.getEndpoint()).orElse(null);
        if (existing == null) {
            existing = new com.hirepath.notifications.domain.NotificationSubscription();
            existing.setUserId(userId);
            existing.setEndpoint(request.getEndpoint());
        }
        existing.setP256dh(request.getP256dh());
        existing.setAuth(request.getAuth());
        existing.setExpirationTime(request.getExpirationTime());
        subscriptionRepository.save(existing);
    }

    private void validateRequest(SendNotificationRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request is required");
        }
        if (request.getModule() == null || request.getModule().isBlank()) {
            throw new IllegalArgumentException("module is required");
        }
        if (request.getEventType() == null || request.getEventType().isBlank()) {
            throw new IllegalArgumentException("event_type is required");
        }
        if (request.getRecipients() == null || request.getRecipients().isEmpty()) {
            throw new IllegalArgumentException("recipients are required");
        }
        boolean hasValidRecipient = request.getRecipients().stream().allMatch(r ->
            (r.getUserId() != null && !r.getUserId().isBlank()) || (r.getEmail() != null && !r.getEmail().isBlank())
        );
        if (!hasValidRecipient) {
            throw new IllegalArgumentException("Each recipient must include userId or email");
        }
        for (RecipientTargetRequest target : request.getRecipients()) {
            if (target.getUserId() != null && !target.getUserId().isBlank()) {
                try {
                    UUID.fromString(target.getUserId());
                } catch (IllegalArgumentException ex) {
                    throw new IllegalArgumentException("Invalid userId: " + target.getUserId());
                }
            }
        }
        if ((request.getTemplateKey() == null || request.getTemplateKey().isBlank()) && request.getContent() == null) {
            throw new IllegalArgumentException("template_key or content is required");
        }
        validateDeepLink(request.getDeeplinkUrl());
    }

    private void validateDeepLink(String deeplinkUrl) {
        if (deeplinkUrl == null || deeplinkUrl.isBlank()) {
            return;
        }
        List<String> allowed = properties.getDeeplink().getAllowedOrigins();
        if (allowed == null || allowed.isEmpty()) {
            return;
        }
        boolean ok = allowed.stream().anyMatch(origin -> deeplinkUrl.startsWith(origin));
        if (!ok) {
            throw new IllegalArgumentException("deeplink_url is not allowed");
        }
    }

    private Notification findIdempotent(SendNotificationRequest request) {
        if (request.getIdempotencyKey() == null || request.getIdempotencyKey().isBlank()) {
            return null;
        }
        return notificationRepository.findByTenantIdAndIdempotencyKey(request.getTenantId(), request.getIdempotencyKey()).orElse(null);
    }

    private List<NotificationChannel> parseChannels(List<String> channels) {
        if (channels == null || channels.isEmpty()) {
            return List.of(NotificationChannel.IN_APP);
        }
        List<NotificationChannel> parsed = new ArrayList<>();
        for (String channel : channels) {
            NotificationChannel parsedChannel = parseChannel(channel);
            if (parsedChannel != null) {
                parsed.add(parsedChannel);
            }
        }
        if (parsed.isEmpty()) {
            parsed.add(NotificationChannel.IN_APP);
        }
        return parsed;
    }

    private NotificationChannel parseChannel(String channel) {
        if (channel == null || channel.isBlank()) {
            return null;
        }
        try {
            String normalized = channel.trim().toUpperCase(Locale.ROOT).replace("-", "_");
            if ("WEBPUSH".equals(normalized)) {
                normalized = "WEB_PUSH";
            }
            return NotificationChannel.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private NotificationPriority parsePriority(String value) {
        if (value == null || value.isBlank()) {
            return NotificationPriority.NORMAL;
        }
        try {
            return NotificationPriority.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return NotificationPriority.NORMAL;
        }
    }

    private UUID parseUserId(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String normalizeBlank(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeModule(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String joinChannels(List<NotificationChannel> channels) {
        return channels.stream().map(ch -> ch.name().toLowerCase(Locale.ROOT)).collect(Collectors.joining(","));
    }

    private String writeVariables(Map<String, Object> variables) {
        if (variables == null || variables.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(variables);
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    private String writeSchema(List<String> schema) {
        if (schema == null || schema.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(schema);
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    private int nextVersion(String key, NotificationChannel channel, String locale) {
        NotificationTemplate template = null;
        if (locale != null && !locale.isBlank()) {
            template = templateRepository.findTopByKeyAndChannelAndLocaleOrderByVersionDesc(key, channel, locale).orElse(null);
        } else {
            template = templateRepository.findTopByKeyAndChannelOrderByVersionDesc(key, channel).orElse(null);
        }
        return template == null ? 1 : template.getVersion() + 1;
    }

    private List<NotificationChannel> applyPreferences(UUID userId, List<NotificationChannel> channels) {
        if (userId == null) {
            return channels;
        }
        List<NotificationChannel> result = new ArrayList<>();
        for (NotificationChannel channel : channels) {
            NotificationPreference preference = preferenceRepository.findByUserIdAndChannel(userId, channel).orElse(null);
            if (preference == null || preference.isEnabled()) {
                result.add(channel);
            }
        }
        return result;
    }

    private OffsetDateTime computeQuietHourDelay(UUID userId, NotificationChannel channel) {
        if (userId == null) {
            return null;
        }
        NotificationPreference preference = preferenceRepository.findByUserIdAndChannel(userId, channel).orElse(null);
        if (preference == null) {
            return null;
        }
        String start = preference.getQuietHoursStart();
        String end = preference.getQuietHoursEnd();
        if (start == null || end == null) {
            return null;
        }
        try {
            LocalTime startTime = LocalTime.parse(start);
            LocalTime endTime = LocalTime.parse(end);
            LocalTime now = LocalTime.now();
            boolean inQuiet;
            if (startTime.isBefore(endTime)) {
                inQuiet = !now.isBefore(startTime) && now.isBefore(endTime);
            } else {
                inQuiet = now.isAfter(startTime) || now.isBefore(endTime);
            }
            if (!inQuiet) {
                return null;
            }
            OffsetDateTime nowDt = OffsetDateTime.now();
            OffsetDateTime target = nowDt.withHour(endTime.getHour()).withMinute(endTime.getMinute()).withSecond(0);
            if (target.isBefore(nowDt)) {
                target = target.plusDays(1);
            }
            return target;
        } catch (Exception ex) {
            return null;
        }
    }

    private void enqueueOutbox(NotificationOutbox outbox) {
        try {
            redisTemplate.opsForStream().add(properties.getStream().getName(), Map.of("outboxId", outbox.getId().toString()));
        } catch (Exception ex) {
            log.warn("Unable to enqueue outbox {}: {}", outbox.getId(), ex.getMessage());
        }
    }
}
