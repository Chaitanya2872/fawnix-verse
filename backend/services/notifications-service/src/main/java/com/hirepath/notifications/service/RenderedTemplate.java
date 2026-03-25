package com.hirepath.notifications.service;

public class RenderedTemplate {
    private final String subject;
    private final String htmlBody;
    private final String textBody;

    public RenderedTemplate(String subject, String htmlBody, String textBody) {
        this.subject = subject;
        this.htmlBody = htmlBody;
        this.textBody = textBody;
    }

    public String getSubject() {
        return subject;
    }

    public String getHtmlBody() {
        return htmlBody;
    }

    public String getTextBody() {
        return textBody;
    }
}
