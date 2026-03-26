package com.hirepath.notifications.dto;

import java.util.List;

public class TemplateUpsertRequest {
    private String key;
    private String channel;
    private String subject;
    private String htmlBody;
    private String textBody;
    private List<String> variablesSchema;
    private Integer version;
    private String locale;

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getHtmlBody() {
        return htmlBody;
    }

    public void setHtmlBody(String htmlBody) {
        this.htmlBody = htmlBody;
    }

    public String getTextBody() {
        return textBody;
    }

    public void setTextBody(String textBody) {
        this.textBody = textBody;
    }

    public List<String> getVariablesSchema() {
        return variablesSchema;
    }

    public void setVariablesSchema(List<String> variablesSchema) {
        this.variablesSchema = variablesSchema;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }
}
