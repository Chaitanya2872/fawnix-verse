package com.hirepath.notifications.dto;

public class PreferenceItemRequest {
    private String channel;
    private boolean enabled = true;
    private String quietHoursStart;
    private String quietHoursEnd;
    private String locale;

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getQuietHoursStart() {
        return quietHoursStart;
    }

    public void setQuietHoursStart(String quietHoursStart) {
        this.quietHoursStart = quietHoursStart;
    }

    public String getQuietHoursEnd() {
        return quietHoursEnd;
    }

    public void setQuietHoursEnd(String quietHoursEnd) {
        this.quietHoursEnd = quietHoursEnd;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }
}
