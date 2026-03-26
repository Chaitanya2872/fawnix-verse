package com.hirepath.recruitment.dto;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class InterviewRoundConfig {
    private Integer roundNumber;
    private String name;
    private String type;
    private Integer durationMinutes;
    private List<String> panelRoles;
    private List<String> panelUsers;
    private String scorecardTemplateId;

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

    public List<String> getPanelRoles() {
        return panelRoles;
    }

    public void setPanelRoles(List<String> panelRoles) {
        this.panelRoles = panelRoles;
    }

    public List<String> getPanelUsers() {
        return panelUsers;
    }

    public void setPanelUsers(List<String> panelUsers) {
        this.panelUsers = panelUsers;
    }

    public String getScorecardTemplateId() {
        return scorecardTemplateId;
    }

    public void setScorecardTemplateId(String scorecardTemplateId) {
        this.scorecardTemplateId = scorecardTemplateId;
    }
}

