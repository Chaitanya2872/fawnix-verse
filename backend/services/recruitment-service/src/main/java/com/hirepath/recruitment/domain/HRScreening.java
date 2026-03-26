package com.hirepath.recruitment.domain;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "hr_screenings")
public class HRScreening {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "application_id")
    private CandidateApplication application;

    @Column(name = "screened_by")
    private String screenedBy;

    @Column(name = "salary_expectation")
    private BigDecimal salaryExpectation;

    @Column(name = "notice_period")
    private String noticePeriod;

    private String availability;

    private String notes;

    private Integer score;

    private String result;

    @CreationTimestamp
    @Column(name = "screened_at")
    private OffsetDateTime screenedAt;

    public UUID getId() {
        return id;
    }

    public CandidateApplication getApplication() {
        return application;
    }

    public void setApplication(CandidateApplication application) {
        this.application = application;
    }

    public String getScreenedBy() {
        return screenedBy;
    }

    public void setScreenedBy(String screenedBy) {
        this.screenedBy = screenedBy;
    }

    public BigDecimal getSalaryExpectation() {
        return salaryExpectation;
    }

    public void setSalaryExpectation(BigDecimal salaryExpectation) {
        this.salaryExpectation = salaryExpectation;
    }

    public String getNoticePeriod() {
        return noticePeriod;
    }

    public void setNoticePeriod(String noticePeriod) {
        this.noticePeriod = noticePeriod;
    }

    public String getAvailability() {
        return availability;
    }

    public void setAvailability(String availability) {
        this.availability = availability;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public OffsetDateTime getScreenedAt() {
        return screenedAt;
    }
}
