package com.hirepath.integration.dto;

import java.util.List;
import java.util.Map;

public class PublishPostingRequest {
    private Map<String, Object> posting;
    private List<String> platforms;

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
