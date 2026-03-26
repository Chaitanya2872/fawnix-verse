package com.hirepath.notifications.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.notifications.dto.PreferencesRequest;
import com.hirepath.notifications.dto.SendNotificationBatchRequest;
import com.hirepath.notifications.dto.SendNotificationRequest;
import com.hirepath.notifications.dto.TemplateUpsertRequest;
import com.hirepath.notifications.dto.WebPushSubscriptionRequest;
import com.hirepath.notifications.service.NotificationService;
import com.hirepath.notifications.service.NotificationSseHub;
import com.hirepath.notifications.service.SendResult;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.hirepath.notifications.security.service.AppUserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationSseHub sseHub;

    public NotificationController(NotificationService notificationService, NotificationSseHub sseHub) {
        this.notificationService = notificationService;
        this.sseHub = sseHub;
    }

    @PostMapping("/send")
    public ResponseEntity<?> send(@RequestBody SendNotificationRequest request) {
        try {
            SendResult result = notificationService.send(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", result.getNotificationId(),
                "deduplicated", result.isDeduplicated(),
                "recipient_ids", result.getRecipientIds()
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/batch")
    public ResponseEntity<?> sendBatch(@RequestBody SendNotificationBatchRequest request) {
        if (request == null || request.getItems() == null) {
            return ResponseEntity.badRequest().body("items are required");
        }
        List<Map<String, Object>> results = request.getItems().stream().map(item -> {
            try {
                SendResult result = notificationService.send(item);
                Map<String, Object> row = new HashMap<>();
                row.put("id", result.getNotificationId());
                row.put("deduplicated", result.isDeduplicated());
                row.put("recipient_ids", result.getRecipientIds());
                row.put("status", "ok");
                return row;
            } catch (IllegalArgumentException ex) {
                Map<String, Object> error = new HashMap<>();
                error.put("status", "error");
                error.put("message", ex.getMessage());
                return error;
            }
        }).toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", results));
    }

    @GetMapping("/inbox")
    public ResponseEntity<?> inbox(
        @AuthenticationPrincipal AppUserDetails user,
        @RequestParam(value = "module", required = false) String module,
        @RequestParam(value = "unread", required = false) Boolean unread
    ) {
        UUID userId = getUserId(user);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        List<Map<String, Object>> data = notificationService.inbox(userId, module, unread);
        long unreadCount = data.stream().filter(item -> !"read".equals(item.get("status"))).count();
        return ResponseEntity.ok(Map.of("data", data, "unread_count", unreadCount));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markRead(@AuthenticationPrincipal AppUserDetails user, @PathVariable("id") UUID recipientId) {
        UUID userId = getUserId(user);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        boolean ok = notificationService.markRead(userId, recipientId);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<?> markReadAll(@AuthenticationPrincipal AppUserDetails user) {
        UUID userId = getUserId(user);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        int count = notificationService.markReadAll(userId);
        return ResponseEntity.ok(Map.of("message", "Marked all as read", "count", count));
    }

    @PostMapping("/preferences")
    public ResponseEntity<?> updatePreferences(
        @AuthenticationPrincipal AppUserDetails user,
        @RequestBody PreferencesRequest request
    ) {
        UUID userId = getUserId(user);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        notificationService.updatePreferences(userId, request);
        return ResponseEntity.ok(Map.of("message", "Preferences updated"));
    }

    @PostMapping("/templates")
    public ResponseEntity<?> upsertTemplate(@RequestBody TemplateUpsertRequest request) {
        try {
            var template = notificationService.upsertTemplate(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", template.getId(),
                "key", template.getKey(),
                "version", template.getVersion()
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @GetMapping("/templates/{key}")
    public ResponseEntity<?> getTemplate(
        @PathVariable("key") String key,
        @RequestParam(value = "channel", required = false) String channel,
        @RequestParam(value = "locale", required = false) String locale
    ) {
        if (channel == null || channel.isBlank()) {
            return ResponseEntity.badRequest().body("channel is required");
        }
        var template = notificationService.getTemplate(key, channel, locale);
        if (template == null) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> row = new HashMap<>();
        row.put("id", template.getId());
        row.put("key", template.getKey());
        row.put("channel", template.getChannel().name().toLowerCase());
        row.put("subject", template.getSubject());
        row.put("html_body", template.getHtmlBody());
        row.put("text_body", template.getTextBody());
        row.put("variables_schema", template.getVariablesSchema());
        row.put("version", template.getVersion());
        row.put("locale", template.getLocale());
        row.put("created_at", template.getCreatedAt());
        row.put("updated_at", template.getUpdatedAt());
        return ResponseEntity.ok(row);
    }

    @PostMapping("/subscriptions/webpush")
    public ResponseEntity<?> upsertSubscription(
        @AuthenticationPrincipal AppUserDetails user,
        @RequestBody WebPushSubscriptionRequest request
    ) {
        UUID userId = getUserId(user);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        notificationService.upsertSubscription(userId, request);
        return ResponseEntity.ok(Map.of("message", "Subscription saved"));
    }

    @GetMapping("/stream")
    public SseEmitter stream(@AuthenticationPrincipal AppUserDetails user) {
        UUID userId = getUserId(user);
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return sseHub.register(userId);
    }

    private UUID getUserId(AppUserDetails user) {
        if (user == null || user.getUserId() == null) {
            return null;
        }
        try {
            return UUID.fromString(user.getUserId());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
