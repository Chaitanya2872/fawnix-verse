package com.hirepath.recruitment.client.dto;

import java.util.List;
import java.util.Map;

public class PublishPostingRequest {
    private Map<String, Object> posting;
    private List<String> platforms;

    public PublishPostingRequest() {}

    public PublishPostingRequest(Map<String, Object> posting, List<String> platforms) {
        this.posting = posting;
        this.platforms = platforms;
    }

    public Map<String, Object> getPosting() {
        return posting;
    }

    public void setPosting(Map<String, Object> posting) {
        this.posting = posting;
    }

    public List<String> getPlatforms() {
        return platforms;
    }

    public void setPlatforms(List<String> platforms) {
        this.platforms = platforms;
    }
}
