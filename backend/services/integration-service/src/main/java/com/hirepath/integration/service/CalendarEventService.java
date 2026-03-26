package com.hirepath.integration.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.hirepath.integration.domain.CalendarProvider;
import com.hirepath.integration.dto.CalendarEventRequest;
import com.hirepath.integration.dto.CalendarEventResponse;
import com.hirepath.integration.dto.CalendarEventUpdateRequest;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CalendarEventService {

    private final CalendarTokenService tokenService;
    private final CalendarHttpClient httpClient;

    public CalendarEventService(CalendarTokenService tokenService, CalendarHttpClient httpClient) {
        this.tokenService = tokenService;
        this.httpClient = httpClient;
    }

    public CalendarEventResponse createEvent(CalendarEventRequest request) {
        CalendarProvider provider = CalendarProvider.fromValue(request.getProvider());
        String organizerUserId = request.getOrganizerUserId();
        if (organizerUserId == null || organizerUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "organizer_user_id is required");
        }
        String accessToken = tokenService.getValidAccessToken(provider, organizerUserId);
        if (provider == CalendarProvider.GOOGLE) {
            return createGoogleEvent(accessToken, request);
        }
        return createMicrosoftEvent(accessToken, request);
    }

    public CalendarEventResponse updateEvent(CalendarProvider provider, String eventId, CalendarEventUpdateRequest request) {
        if (eventId == null || eventId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "event_id is required");
        }
        String organizerUserId = request.getOrganizerUserId();
        if (organizerUserId == null || organizerUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "organizer_user_id is required");
        }
        String accessToken = tokenService.getValidAccessToken(provider, organizerUserId);
        if (provider == CalendarProvider.GOOGLE) {
            return updateGoogleEvent(accessToken, eventId, request);
        }
        return updateMicrosoftEvent(accessToken, eventId, request);
    }

    public void deleteEvent(CalendarProvider provider, String eventId, String organizerUserId) {
        if (eventId == null || eventId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "event_id is required");
        }
        if (organizerUserId == null || organizerUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "organizer_user_id is required");
        }
        String accessToken = tokenService.getValidAccessToken(provider, organizerUserId);
        if (provider == CalendarProvider.GOOGLE) {
            httpClient.delete("https://www.googleapis.com/calendar/v3/calendars/primary/events/" + eventId + "?sendUpdates=all", accessToken);
        } else {
            httpClient.delete("https://graph.microsoft.com/v1.0/me/events/" + eventId, accessToken);
        }
    }

    private CalendarEventResponse createGoogleEvent(String accessToken, CalendarEventRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("summary", request.getSummary());
        payload.put("description", buildDescription(request.getDescription(), request.getMeetingLink()));
        if (request.getLocation() != null) {
            payload.put("location", request.getLocation());
        }
        payload.put("start", Map.of(
            "dateTime", request.getStartTime(),
            "timeZone", resolveTimeZone(request.getTimeZone())
        ));
        payload.put("end", Map.of(
            "dateTime", request.getEndTime(),
            "timeZone", resolveTimeZone(request.getTimeZone())
        ));
        List<Map<String, String>> attendees = buildAttendees(request.getAttendees());
        if (!attendees.isEmpty()) {
            payload.put("attendees", attendees);
        }
        if (Boolean.TRUE.equals(request.getOnlineMeeting()) && request.getMeetingLink() == null) {
            payload.put("conferenceData", Map.of(
                "createRequest", Map.of(
                    "requestId", java.util.UUID.randomUUID().toString()
                )
            ));
        }
        Map<String, Object> response = httpClient.postJson(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
            payload,
            accessToken
        );
        String eventId = valueAsString(response.get("id"));
        String meetingLink = valueAsString(response.get("hangoutLink"));
        if (meetingLink == null) {
            meetingLink = extractGoogleMeetingLink(response);
        }
        return new CalendarEventResponse(CalendarProvider.GOOGLE.getValue(), eventId, meetingLink);
    }

    private CalendarEventResponse updateGoogleEvent(String accessToken, String eventId, CalendarEventUpdateRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        if (request.getSummary() != null) payload.put("summary", request.getSummary());
        if (request.getDescription() != null || request.getMeetingLink() != null) {
            payload.put("description", buildDescription(request.getDescription(), request.getMeetingLink()));
        }
        if (request.getLocation() != null) payload.put("location", request.getLocation());
        if (request.getStartTime() != null) {
            payload.put("start", Map.of(
                "dateTime", request.getStartTime(),
                "timeZone", resolveTimeZone(request.getTimeZone())
            ));
        }
        if (request.getEndTime() != null) {
            payload.put("end", Map.of(
                "dateTime", request.getEndTime(),
                "timeZone", resolveTimeZone(request.getTimeZone())
            ));
        }
        List<Map<String, String>> attendees = buildAttendees(request.getAttendees());
        if (!attendees.isEmpty()) {
            payload.put("attendees", attendees);
        }
        if (Boolean.TRUE.equals(request.getOnlineMeeting()) && request.getMeetingLink() == null) {
            payload.put("conferenceData", Map.of(
                "createRequest", Map.of(
                    "requestId", java.util.UUID.randomUUID().toString()
                )
            ));
        }
        Map<String, Object> response = httpClient.patchJson(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events/" + eventId + "?conferenceDataVersion=1&sendUpdates=all",
            payload,
            accessToken
        );
        String meetingLink = valueAsString(response.get("hangoutLink"));
        if (meetingLink == null) {
            meetingLink = extractGoogleMeetingLink(response);
        }
        return new CalendarEventResponse(CalendarProvider.GOOGLE.getValue(), eventId, meetingLink);
    }

    private CalendarEventResponse createMicrosoftEvent(String accessToken, CalendarEventRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("subject", request.getSummary());
        payload.put("body", Map.of(
            "contentType", "HTML",
            "content", buildDescription(request.getDescription(), request.getMeetingLink())
        ));
        payload.put("start", Map.of(
            "dateTime", request.getStartTime(),
            "timeZone", resolveTimeZone(request.getTimeZone())
        ));
        payload.put("end", Map.of(
            "dateTime", request.getEndTime(),
            "timeZone", resolveTimeZone(request.getTimeZone())
        ));
        if (request.getLocation() != null) {
            payload.put("location", Map.of("displayName", request.getLocation()));
        }
        List<Map<String, Object>> attendees = buildMicrosoftAttendees(request.getAttendees());
        if (!attendees.isEmpty()) {
            payload.put("attendees", attendees);
        }
        if (Boolean.TRUE.equals(request.getOnlineMeeting())) {
            payload.put("isOnlineMeeting", true);
            payload.put("onlineMeetingProvider", "teamsForBusiness");
        }
        Map<String, Object> response = httpClient.postJson(
            "https://graph.microsoft.com/v1.0/me/events",
            payload,
            accessToken
        );
        String eventId = valueAsString(response.get("id"));
        String meetingLink = null;
        Object onlineMeeting = response.get("onlineMeeting");
        if (onlineMeeting instanceof Map<?, ?> map) {
            meetingLink = valueAsString(map.get("joinUrl"));
        }
        return new CalendarEventResponse(CalendarProvider.MICROSOFT.getValue(), eventId, meetingLink);
    }

    private CalendarEventResponse updateMicrosoftEvent(String accessToken, String eventId, CalendarEventUpdateRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        if (request.getSummary() != null) {
            payload.put("subject", request.getSummary());
        }
        if (request.getDescription() != null || request.getMeetingLink() != null) {
            payload.put("body", Map.of(
                "contentType", "HTML",
                "content", buildDescription(request.getDescription(), request.getMeetingLink())
            ));
        }
        if (request.getStartTime() != null) {
            payload.put("start", Map.of(
                "dateTime", request.getStartTime(),
                "timeZone", resolveTimeZone(request.getTimeZone())
            ));
        }
        if (request.getEndTime() != null) {
            payload.put("end", Map.of(
                "dateTime", request.getEndTime(),
                "timeZone", resolveTimeZone(request.getTimeZone())
            ));
        }
        if (request.getLocation() != null) {
            payload.put("location", Map.of("displayName", request.getLocation()));
        }
        List<Map<String, Object>> attendees = buildMicrosoftAttendees(request.getAttendees());
        if (!attendees.isEmpty()) {
            payload.put("attendees", attendees);
        }
        if (Boolean.TRUE.equals(request.getOnlineMeeting())) {
            payload.put("isOnlineMeeting", true);
            payload.put("onlineMeetingProvider", "teamsForBusiness");
        }
        httpClient.patchJson(
            "https://graph.microsoft.com/v1.0/me/events/" + eventId,
            payload,
            accessToken
        );
        return new CalendarEventResponse(CalendarProvider.MICROSOFT.getValue(), eventId, null);
    }

    private List<Map<String, String>> buildAttendees(List<String> emails) {
        List<Map<String, String>> attendees = new ArrayList<>();
        if (emails == null) {
            return attendees;
        }
        for (String email : emails) {
            if (email == null || email.isBlank()) continue;
            attendees.add(Map.of("email", email));
        }
        return attendees;
    }

    private List<Map<String, Object>> buildMicrosoftAttendees(List<String> emails) {
        List<Map<String, Object>> attendees = new ArrayList<>();
        if (emails == null) {
            return attendees;
        }
        for (String email : emails) {
            if (email == null || email.isBlank()) continue;
            attendees.add(Map.of(
                "emailAddress", Map.of("address", email),
                "type", "required"
            ));
        }
        return attendees;
    }

    private String buildDescription(String description, String meetingLink) {
        StringBuilder sb = new StringBuilder();
        if (description != null && !description.isBlank()) {
            sb.append(description.trim());
        }
        if (meetingLink != null && !meetingLink.isBlank()) {
            if (sb.length() > 0) {
                sb.append("<br/><br/>");
            }
            sb.append("Meeting: ").append(meetingLink.trim());
        }
        return sb.toString();
    }

    private String resolveTimeZone(String timeZone) {
        return (timeZone == null || timeZone.isBlank()) ? "UTC" : timeZone;
    }

    private String extractGoogleMeetingLink(Map<String, Object> response) {
        Object conference = response.get("conferenceData");
        if (conference instanceof Map<?, ?> conferenceMap) {
            Object entryPoints = conferenceMap.get("entryPoints");
            if (entryPoints instanceof List<?> list) {
                for (Object entry : list) {
                    if (entry instanceof Map<?, ?> map) {
                        Object type = map.get("entryPointType");
                        if ("video".equals(String.valueOf(type))) {
                            return valueAsString(map.get("uri"));
                        }
                    }
                }
            }
        }
        return null;
    }

    private String valueAsString(Object value) {
        return value != null ? value.toString() : null;
    }
}
