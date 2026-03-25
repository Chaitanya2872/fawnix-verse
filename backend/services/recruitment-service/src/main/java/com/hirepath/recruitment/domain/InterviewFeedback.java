package com.hirepath.recruitment.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "interview_feedback")
public class InterviewFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "interview_id")
    private Interview interview;

    @Column(name = "interviewer_id")
    private String interviewerId;

    @Column(name = "technical_score")
    private Integer technicalScore;

    @Column(name = "communication_score")
    private Integer communicationScore;

    @Column(name = "cultural_score")
    private Integer culturalScore;

    @Column(name = "overall_score")
    private Integer overallScore;

    private String strengths;

    private String weaknesses;

    private String notes;

    private String recommendation;

    @CreationTimestamp
    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    public UUID getId() {
        return id;
    }

    public Interview getInterview() {
        return interview;
    }

    public void setInterview(Interview interview) {
        this.interview = interview;
    }

    public String getInterviewerId() {
        return interviewerId;
    }

    public void setInterviewerId(String interviewerId) {
        this.interviewerId = interviewerId;
    }

    public Integer getTechnicalScore() {
        return technicalScore;
    }

    public void setTechnicalScore(Integer technicalScore) {
        this.technicalScore = technicalScore;
    }

    public Integer getCommunicationScore() {
        return communicationScore;
    }

    public void setCommunicationScore(Integer communicationScore) {
        this.communicationScore = communicationScore;
    }

    public Integer getCulturalScore() {
        return culturalScore;
    }

    public void setCulturalScore(Integer culturalScore) {
        this.culturalScore = culturalScore;
    }

    public Integer getOverallScore() {
        return overallScore;
    }

    public void setOverallScore(Integer overallScore) {
        this.overallScore = overallScore;
    }

    public String getStrengths() {
        return strengths;
    }

    public void setStrengths(String strengths) {
        this.strengths = strengths;
    }

    public String getWeaknesses() {
        return weaknesses;
    }

    public void setWeaknesses(String weaknesses) {
        this.weaknesses = weaknesses;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public OffsetDateTime getSubmittedAt() {
        return submittedAt;
    }
}
