package com.hirepath.recruitment.client;

import com.hirepath.recruitment.client.dto.CalendarEventRequest;
import com.hirepath.recruitment.client.dto.CalendarEventResponse;
import com.hirepath.recruitment.client.dto.CalendarEventUpdateRequest;
import com.hirepath.recruitment.client.dto.PublishPostingRequest;
import com.hirepath.recruitment.client.dto.PublishPostingResponse;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "integration-service")
public interface IntegrationClient {

    @PostMapping("/internal/postings/publish")
    PublishPostingResponse publish(@RequestBody PublishPostingRequest request);

    @PostMapping("/internal/calendar/events")
    CalendarEventResponse createCalendarEvent(@RequestBody CalendarEventRequest request);

    @PatchMapping("/internal/calendar/events/{provider}/{eventId}")
    CalendarEventResponse updateCalendarEvent(
        @PathVariable("provider") String provider,
        @PathVariable("eventId") String eventId,
        @RequestBody CalendarEventUpdateRequest request
    );

    @DeleteMapping("/internal/calendar/events/{provider}/{eventId}")
    void deleteCalendarEvent(
        @PathVariable("provider") String provider,
        @PathVariable("eventId") String eventId,
        @RequestParam("organizer_user_id") String organizerUserId
    );
}
