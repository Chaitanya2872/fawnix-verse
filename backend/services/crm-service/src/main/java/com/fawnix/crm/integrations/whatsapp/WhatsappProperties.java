package com.fawnix.crm.integrations.whatsapp;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.integrations.whatsapp")
public record WhatsappProperties(
    boolean enabled,
    String verifyToken,
    String appSecret,
    String accessToken,
    String apiVersion,
    String phoneNumberId,
    String businessAccountId,
    String templateName,
    String templateLanguage,
    boolean templateUseLeadName,
    String assignTemplateName,
    String assignTemplateLanguage,
    String defaultCountryCode
) {
}
