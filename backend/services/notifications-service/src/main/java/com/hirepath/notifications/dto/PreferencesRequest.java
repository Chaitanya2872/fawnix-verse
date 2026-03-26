package com.hirepath.notifications.dto;

import java.util.List;

public class PreferencesRequest {
    private List<PreferenceItemRequest> preferences;

    public List<PreferenceItemRequest> getPreferences() {
        return preferences;
    }

    public void setPreferences(List<PreferenceItemRequest> preferences) {
        this.preferences = preferences;
    }
}
