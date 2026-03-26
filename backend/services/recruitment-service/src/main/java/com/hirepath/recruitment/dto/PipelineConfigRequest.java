package com.hirepath.recruitment.dto;

import java.util.List;

public class PipelineConfigRequest {
    private List<StageRequest> stages;

    public List<StageRequest> getStages() {
        return stages;
    }

    public void setStages(List<StageRequest> stages) {
        this.stages = stages;
    }

    public static class StageRequest {
        private String name;
        private Integer orderIndex;
        private Boolean terminal;
        private Boolean active;
        private String category;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public Integer getOrderIndex() {
            return orderIndex;
        }

        public void setOrderIndex(Integer orderIndex) {
            this.orderIndex = orderIndex;
        }

        public Boolean getTerminal() {
            return terminal;
        }

        public void setTerminal(Boolean terminal) {
            this.terminal = terminal;
        }

        public Boolean getActive() {
            return active;
        }

        public void setActive(Boolean active) {
            this.active = active;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }
    }
}
