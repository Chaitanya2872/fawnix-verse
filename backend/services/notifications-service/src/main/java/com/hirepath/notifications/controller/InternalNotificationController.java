package com.hirepath.notifications.controller;

import java.util.Map;

import com.hirepath.notifications.dto.SendNotificationRequest;
import com.hirepath.notifications.service.NotificationService;
import com.hirepath.notifications.service.SendResult;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/notifications")
public class InternalNotificationController {

    private final NotificationService notificationService;

    public InternalNotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/events")
    public ResponseEntity<?> ingest(@RequestBody SendNotificationRequest request) {
        try {
            SendResult result = notificationService.send(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", result.getNotificationId(),
                "deduplicated", result.isDeduplicated()
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }
}
