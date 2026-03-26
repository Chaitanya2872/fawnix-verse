package com.hirepath.notifications.service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hirepath.notifications.domain.Notification;
import com.hirepath.notifications.domain.NotificationChannel;
import com.hirepath.notifications.domain.NotificationTemplate;
import com.hirepath.notifications.repository.NotificationTemplateRepository;

import org.springframework.stereotype.Component;

@Component
public class TemplateResolver {

    private final NotificationTemplateRepository templateRepository;
    private final TemplateRenderer renderer;
    private final ObjectMapper objectMapper;

    public TemplateResolver(
        NotificationTemplateRepository templateRepository,
        TemplateRenderer renderer,
        ObjectMapper objectMapper
    ) {
        this.templateRepository = templateRepository;
        this.renderer = renderer;
        this.objectMapper = objectMapper;
    }

    public RenderedTemplate resolve(Notification notification, NotificationChannel channel) {
        if (notification.getTemplateKey() == null || notification.getTemplateKey().isBlank()) {
            return new RenderedTemplate(notification.getTitle(), notification.getBodyHtml(), notification.getBodyText());
        }
        NotificationTemplate template = findTemplate(notification, channel);
        if (template == null) {
            return new RenderedTemplate(notification.getTitle(), notification.getBodyHtml(), notification.getBodyText());
        }
        Map<String, Object> variables = parseVariables(notification.getTemplateVariables());
        validateVariables(template.getVariablesSchema(), variables);

        String subject = renderer.renderText(template.getSubject(), variables);
        String html = renderer.renderHtml(template.getHtmlBody(), variables);
        String text = renderer.renderText(template.getTextBody(), variables);
        return new RenderedTemplate(subject, html, text);
    }

    private NotificationTemplate findTemplate(Notification notification, NotificationChannel channel) {
        String key = notification.getTemplateKey();
        String locale = notification.getLocale();
        if (locale != null && !locale.isBlank()) {
            return templateRepository.findTopByKeyAndChannelAndLocaleOrderByVersionDesc(key, channel, locale).orElse(null);
        }
        return templateRepository.findTopByKeyAndChannelOrderByVersionDesc(key, channel).orElse(null);
    }

    private Map<String, Object> parseVariables(String raw) {
        if (raw == null || raw.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Collections.emptyMap();
        }
    }

    private void validateVariables(String schemaJson, Map<String, Object> variables) {
        if (schemaJson == null || schemaJson.isBlank()) {
            return;
        }
        try {
            List<String> required = objectMapper.readValue(schemaJson, new TypeReference<List<String>>() {});
            for (String key : required) {
                if (key != null && !key.isBlank() && !variables.containsKey(key)) {
                    throw new IllegalArgumentException("Missing template variable: " + key);
                }
            }
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            // ignore invalid schema
        }
    }
}
