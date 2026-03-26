package com.hirepath.recruitment.dto;

import java.util.List;

public class InterviewRoundConfigRequest {
    private List<RoundRequest> rounds;

    public List<RoundRequest> getRounds() {
        return rounds;
    }

    public void setRounds(List<RoundRequest> rounds) {
        this.rounds = rounds;
    }

    public static class RoundRequest {
        private Integer roundNumber;
        private String name;
        private String type;
        private Integer durationMinutes;
        private String panelRoles;
        private String scorecardId;
        private Boolean required;

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

        public Boolean getRequired() {
            return required;
        }

        public void setRequired(Boolean required) {
            this.required = required;
        }
    }
}
