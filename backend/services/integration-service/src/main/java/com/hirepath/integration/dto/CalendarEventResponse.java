package com.hirepath.integration.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class CalendarEventResponse {
    private String provider;
    private String eventId;
    private String meetingLink;

    public CalendarEventResponse() {}

    public CalendarEventResponse(String provider, String eventId, String meetingLink) {
        this.provider = provider;
        this.eventId = eventId;
        this.meetingLink = meetingLink;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getEventId() {
        return eventId;
    }

    public void setEventId(String eventId) {
        this.eventId = eventId;
    }

    public String getMeetingLink() {
        return meetingLink;
    }

    public void setMeetingLink(String meetingLink) {
        this.meetingLink = meetingLink;
    }
}
