package com.hirepath.recruitment.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "interview_panels")
public class InterviewPanel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "interview_id")
    private Interview interview;

    @Column(name = "interviewer_id")
    private String interviewerId;

    private String role;

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

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
