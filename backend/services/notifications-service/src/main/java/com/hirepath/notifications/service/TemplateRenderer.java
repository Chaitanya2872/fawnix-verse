package com.hirepath.notifications.service;

import java.util.Map;

import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templateresolver.StringTemplateResolver;
import org.thymeleaf.templatemode.TemplateMode;

@Component
public class TemplateRenderer {

    private final TemplateEngine htmlEngine;
    private final TemplateEngine textEngine;

    public TemplateRenderer() {
        this.htmlEngine = buildEngine(TemplateMode.HTML);
        this.textEngine = buildEngine(TemplateMode.TEXT);
    }

    private TemplateEngine buildEngine(TemplateMode mode) {
        StringTemplateResolver resolver = new StringTemplateResolver();
        resolver.setTemplateMode(mode);
        resolver.setCacheable(false);
        TemplateEngine engine = new TemplateEngine();
        engine.setTemplateResolver(resolver);
        return engine;
    }

    public String renderHtml(String template, Map<String, Object> variables) {
        return render(template, variables, htmlEngine);
    }

    public String renderText(String template, Map<String, Object> variables) {
        return render(template, variables, textEngine);
    }

    private String render(String template, Map<String, Object> variables, TemplateEngine engine) {
        if (template == null || template.isBlank()) {
            return null;
        }
        Context context = new Context();
        if (variables != null) {
            context.setVariables(variables);
        }
        return engine.process(template, context);
    }
}
