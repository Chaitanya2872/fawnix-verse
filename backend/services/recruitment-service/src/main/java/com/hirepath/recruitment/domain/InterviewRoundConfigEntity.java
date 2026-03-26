package com.hirepath.recruitment.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "interview_rounds_config")
public class InterviewRoundConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "vacancy_id", nullable = false)
    private UUID vacancyId;

    @Column(name = "round_number")
    private Integer roundNumber;

    private String name;
    private String type;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "panel_roles")
    private String panelRoles;

    @Column(name = "scorecard_id")
    private String scorecardId;

    @Column(name = "is_required")
    private boolean required = true;

    public UUID getId() {
        return id;
    }

    public UUID getVacancyId() {
        return vacancyId;
    }

    public void setVacancyId(UUID vacancyId) {
        this.vacancyId = vacancyId;
    }

    public Integer getRoundNumber() {
        return roundNumber;
    }

    public void setRoundNumber(Integer roundNumber) {
        this.roundNumber = roundNumber;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public String getPanelRoles() {
        return panelRoles;
    }

    public void setPanelRoles(String panelRoles) {
        this.panelRoles = panelRoles;
    }

    public String getScorecardId() {
        return scorecardId;
    }

    public void setScorecardId(String scorecardId) {
        this.scorecardId = scorecardId;
    }

    public boolean isRequired() {
        return required;
    }

    public void setRequired(boolean required) {
        this.required = required;
    }
}
