package com.hirepath.integration.controller;

import java.util.List;
import java.util.Map;

import com.hirepath.integration.domain.CalendarProvider;
import com.hirepath.integration.dto.CalendarConnectionResponse;
import com.hirepath.integration.repository.CalendarConnectionRepository;
import com.hirepath.integration.security.service.AppUserDetails;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/calendar/connections")
public class CalendarConnectionController {

    private final CalendarConnectionRepository repository;

    public CalendarConnectionController(CalendarConnectionRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Map<String, List<CalendarConnectionResponse>> list(@AuthenticationPrincipal AppUserDetails user) {
        String userId = user != null ? user.getUserId() : null;
        if (userId == null || userId.isBlank()) {
            return Map.of("data", List.of());
        }
        List<CalendarConnectionResponse> data = repository.findAllByUserId(userId).stream()
            .map(conn -> new CalendarConnectionResponse(
                conn.getProvider().getValue(),
                conn.getAccountEmail(),
                conn.isActive(),
                conn.getExpiresAt()
            ))
            .toList();
        return Map.of("data", data);
    }

    @DeleteMapping("/{provider}")
    public ResponseEntity<?> disconnect(@PathVariable String provider, @AuthenticationPrincipal AppUserDetails user) {
        String userId = user != null ? user.getUserId() : null;
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        CalendarProvider calendarProvider = CalendarProvider.fromValue(provider);
        repository.deleteByProviderAndUserId(calendarProvider, userId);
        return ResponseEntity.ok(Map.of("message", "Calendar disconnected"));
    }
}
