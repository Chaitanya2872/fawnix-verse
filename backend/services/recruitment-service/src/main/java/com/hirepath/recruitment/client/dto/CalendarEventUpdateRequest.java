package com.hirepath.recruitment.client.dto;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class CalendarEventUpdateRequest {
    private String organizerUserId;
    private String summary;
    private String description;
    private String startTime;
    private String endTime;
    private String timeZone;
    private String location;
    private String meetingLink;
    private Boolean onlineMeeting;
    private List<String> attendees;

    public String getOrganizerUserId() {
        return organizerUserId;
    }

    public void setOrganizerUserId(String organizerUserId) {
        this.organizerUserId = organizerUserId;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public String getTimeZone() {
        return timeZone;
    }

    public void setTimeZone(String timeZone) {
        this.timeZone = timeZone;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getMeetingLink() {
        return meetingLink;
    }

    public void setMeetingLink(String meetingLink) {
        this.meetingLink = meetingLink;
    }

    public Boolean getOnlineMeeting() {
        return onlineMeeting;
    }

    public void setOnlineMeeting(Boolean onlineMeeting) {
        this.onlineMeeting = onlineMeeting;
    }

    public List<String> getAttendees() {
        return attendees;
    }

    public void setAttendees(List<String> attendees) {
        this.attendees = attendees;
    }
}
