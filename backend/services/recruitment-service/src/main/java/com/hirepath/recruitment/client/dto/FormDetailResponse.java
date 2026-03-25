package com.hirepath.recruitment.client.dto;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class FormDetailResponse {
    private String id;
    private String name;
    private String description;
    private String status;
    private String publicSlug;
    private String positionId;
    private String module;
    private List<FormFieldResponse> fields;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPublicSlug() {
        return publicSlug;
    }

    public void setPublicSlug(String publicSlug) {
        this.publicSlug = publicSlug;
    }

    public String getPositionId() {
        return positionId;
    }

    public void setPositionId(String positionId) {
        this.positionId = positionId;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public List<FormFieldResponse> getFields() {
        return fields;
    }

    public void setFields(List<FormFieldResponse> fields) {
        this.fields = fields;
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class FormFieldResponse {
        private String fieldKey;
        private String label;
        private String type;
        private boolean required;
        private List<String> options;
        private Map<String, Object> config;
        private Integer order;

        public String getFieldKey() {
            return fieldKey;
        }

        public void setFieldKey(String fieldKey) {
            this.fieldKey = fieldKey;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public boolean isRequired() {
            return required;
        }

        public void setRequired(boolean required) {
            this.required = required;
        }

        public List<String> getOptions() {
            return options;
        }

        public void setOptions(List<String> options) {
            this.options = options;
        }

        public Map<String, Object> getConfig() {
            return config;
        }

        public void setConfig(Map<String, Object> config) {
            this.config = config;
        }

        public Integer getOrder() {
            return order;
        }

        public void setOrder(Integer order) {
            this.order = order;
        }
    }
}
