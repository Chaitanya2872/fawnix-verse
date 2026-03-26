package com.hirepath.integration.dto;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PublishPostingResponse {
    private String postingId;
    private List<PublishPostingResult> results;

    public PublishPostingResponse() {}

    public PublishPostingResponse(String postingId, List<PublishPostingResult> results) {
        this.postingId = postingId;
        this.results = results;
    }

    public String getPostingId() {
        return postingId;
    }

    public void setPostingId(String postingId) {
        this.postingId = postingId;
    }

    public List<PublishPostingResult> getResults() {
        return results;
    }

    public void setResults(List<PublishPostingResult> results) {
        this.results = results;
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PublishPostingResult {
        private String platform;
        private String status;
        private String externalUrl;
        private String errorMessage;

        public PublishPostingResult() {}

        public PublishPostingResult(String platform, String status, String externalUrl, String errorMessage) {
            this.platform = platform;
            this.status = status;
            this.externalUrl = externalUrl;
            this.errorMessage = errorMessage;
        }

        public String getPlatform() {
            return platform;
        }

        public void setPlatform(String platform) {
            this.platform = platform;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getExternalUrl() {
            return externalUrl;
        }

        public void setExternalUrl(String externalUrl) {
            this.externalUrl = externalUrl;
        }

        public String getErrorMessage() {
            return errorMessage;
        }

        public void setErrorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
        }
    }
}
