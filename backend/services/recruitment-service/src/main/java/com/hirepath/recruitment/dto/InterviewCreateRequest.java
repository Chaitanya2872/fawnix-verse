package com.hirepath.recruitment.dto;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class InterviewCreateRequest {
    private String applicationId;
    private Integer roundNumber;
    private String interviewType;
    private String mode;
    private String scheduledAt;
    private Integer durationMinutes;
    private String location;
    private String meetingLink;
    private String calendarProvider;
    private String calendarEventId;
    private List<InterviewerRequest> interviewers;

    public String getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(String applicationId) {
        this.applicationId = applicationId;
    }

    public Integer getRoundNumber() {
        return roundNumber;
    }

    public void setRoundNumber(Integer roundNumber) {
        this.roundNumber = roundNumber;
    }

    public String getInterviewType() {
        return interviewType;
    }

    public void setInterviewType(String interviewType) {
        this.interviewType = interviewType;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(String scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
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

    public String getCalendarProvider() {
        return calendarProvider;
    }

    public void setCalendarProvider(String calendarProvider) {
        this.calendarProvider = calendarProvider;
    }

    public String getCalendarEventId() {
        return calendarEventId;
    }

    public void setCalendarEventId(String calendarEventId) {
        this.calendarEventId = calendarEventId;
    }

    public List<InterviewerRequest> getInterviewers() {
        return interviewers;
    }

    public void setInterviewers(List<InterviewerRequest> interviewers) {
        this.interviewers = interviewers;
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class InterviewerRequest {
        private String interviewerId;
        private String role;

        public String getInterviewerId() {
            return interviewerId;
        }

        public void setInterviewerId(String interviewerId) {
            this.interviewerId = interviewerId;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }
    }
}
