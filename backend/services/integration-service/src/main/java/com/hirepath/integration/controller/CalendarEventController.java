package com.hirepath.integration.controller;

import java.util.Map;

import com.hirepath.integration.domain.CalendarProvider;
import com.hirepath.integration.dto.CalendarEventRequest;
import com.hirepath.integration.dto.CalendarEventResponse;
import com.hirepath.integration.dto.CalendarEventUpdateRequest;
import com.hirepath.integration.service.CalendarEventService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/calendar/events")
public class CalendarEventController {

    private final CalendarEventService eventService;

    public CalendarEventController(CalendarEventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public CalendarEventResponse create(@RequestBody CalendarEventRequest request) {
        return eventService.createEvent(request);
    }

    @PatchMapping("/{provider}/{eventId}")
    public CalendarEventResponse update(
        @PathVariable String provider,
        @PathVariable String eventId,
        @RequestBody CalendarEventUpdateRequest request
    ) {
        return eventService.updateEvent(CalendarProvider.fromValue(provider), eventId, request);
    }

    @DeleteMapping("/{provider}/{eventId}")
    public ResponseEntity<?> delete(
        @PathVariable String provider,
        @PathVariable String eventId,
        @RequestParam(name = "organizer_user_id") String organizerUserId
    ) {
        eventService.deleteEvent(CalendarProvider.fromValue(provider), eventId, organizerUserId);
        return ResponseEntity.ok(Map.of("message", "Calendar event deleted"));
    }
}
