package com.hirepath.recruitment.domain;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "interviews")
public class Interview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "application_id")
    private CandidateApplication application;

    @Column(name = "round_number")
    private Integer roundNumber = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_type")
    private InterviewType interviewType;

    @Enumerated(EnumType.STRING)
    private InterviewMode mode;

    @Column(name = "scheduled_at")
    private OffsetDateTime scheduledAt;

    @Column(name = "duration_minutes")
    private Integer durationMinutes = 60;

    private String location;

    @Column(name = "meeting_link")
    private String meetingLink;

    @Column(name = "calendar_provider")
    private String calendarProvider;

    @Column(name = "calendar_event_id")
    private String calendarEventId;

    private String status = "scheduled";

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @OneToMany(mappedBy = "interview")
    private List<InterviewPanel> interviewers = new ArrayList<>();

    @OneToMany(mappedBy = "interview")
    private List<InterviewFeedback> feedback = new ArrayList<>();

    public UUID getId() {
        return id;
    }

    public CandidateApplication getApplication() {
        return application;
    }

    public void setApplication(CandidateApplication application) {
        this.application = application;
    }

    public Integer getRoundNumber() {
        return roundNumber;
    }

    public void setRoundNumber(Integer roundNumber) {
        this.roundNumber = roundNumber;
    }

    public InterviewType getInterviewType() {
        return interviewType;
    }

    public void setInterviewType(InterviewType interviewType) {
        this.interviewType = interviewType;
    }

    public InterviewMode getMode() {
        return mode;
    }

    public void setMode(InterviewMode mode) {
        this.mode = mode;
    }

    public OffsetDateTime getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(OffsetDateTime scheduledAt) {
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public List<InterviewPanel> getInterviewers() {
        return interviewers;
    }

    public void setInterviewers(List<InterviewPanel> interviewers) {
        this.interviewers = interviewers;
    }

    public List<InterviewFeedback> getFeedback() {
        return feedback;
    }

    public void setFeedback(List<InterviewFeedback> feedback) {
        this.feedback = feedback;
    }
}
