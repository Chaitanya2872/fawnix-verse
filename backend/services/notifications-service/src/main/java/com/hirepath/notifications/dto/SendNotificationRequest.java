package com.hirepath.notifications.dto;

import java.util.List;
import java.util.Map;

public class SendNotificationRequest {
    private String tenantId;
    private String module;
    private String eventType;
    private List<RecipientTargetRequest> recipients;
    private List<String> channels;
    private String templateKey;
    private NotificationContentRequest content;
    private Map<String, Object> variables;
    private String deeplinkUrl;
    private String priority;
    private String idempotencyKey;
    private String locale;

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public List<RecipientTargetRequest> getRecipients() {
        return recipients;
    }

    public void setRecipients(List<RecipientTargetRequest> recipients) {
        this.recipients = recipients;
    }

    public List<String> getChannels() {
        return channels;
    }

    public void setChannels(List<String> channels) {
        this.channels = channels;
    }

    public String getTemplateKey() {
        return templateKey;
    }

    public void setTemplateKey(String templateKey) {
        this.templateKey = templateKey;
    }

    public NotificationContentRequest getContent() {
        return content;
    }

    public void setContent(NotificationContentRequest content) {
        this.content = content;
    }

    public Map<String, Object> getVariables() {
        return variables;
    }

    public void setVariables(Map<String, Object> variables) {
        this.variables = variables;
    }

    public String getDeeplinkUrl() {
        return deeplinkUrl;
    }

    public void setDeeplinkUrl(String deeplinkUrl) {
        this.deeplinkUrl = deeplinkUrl;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }
}
