package com.fawnix.crm.integrations.meta;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.integrations.meta")
public record MetaLeadProperties(
    boolean enabled,
    String verifyToken,
    String appSecret,
    String accessToken,
    String apiVersion,
    String defaultStatus,
    String defaultPriority,
    String defaultSource,
    String defaultTags
) {
}
