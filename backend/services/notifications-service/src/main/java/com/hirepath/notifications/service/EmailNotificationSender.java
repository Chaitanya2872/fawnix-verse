package com.hirepath.notifications.service;

import com.hirepath.notifications.config.NotificationProperties;
import com.hirepath.notifications.domain.Notification;
import com.hirepath.notifications.domain.NotificationChannel;
import com.hirepath.notifications.domain.NotificationRecipient;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import jakarta.mail.internet.MimeMessage;

@Component
public class EmailNotificationSender implements NotificationChannelSender {

    private final JavaMailSender mailSender;
    private final TemplateResolver templateResolver;
    private final NotificationProperties properties;

    public EmailNotificationSender(
        JavaMailSender mailSender,
        TemplateResolver templateResolver,
        NotificationProperties properties
    ) {
        this.mailSender = mailSender;
        this.templateResolver = templateResolver;
        this.properties = properties;
    }

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.EMAIL;
    }

    @Override
    public DeliveryResult send(Notification notification, NotificationRecipient recipient) {
        if (recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return DeliveryResult.failed("Missing recipient email");
        }
        RenderedTemplate rendered = templateResolver.resolve(notification, NotificationChannel.EMAIL);
        String subject = rendered.getSubject() != null ? rendered.getSubject() : notification.getTitle();
        String html = rendered.getHtmlBody() != null ? rendered.getHtmlBody() : notification.getBodyHtml();
        String text = rendered.getTextBody() != null ? rendered.getTextBody() : notification.getBodyText();
        if ((html == null || html.isBlank()) && (text == null || text.isBlank())) {
            text = "You have a new notification.";
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(recipient.getEmail());
            if (subject == null || subject.isBlank()) {
                subject = "Notification";
            }
            helper.setSubject(subject);
            String from = properties.getEmail().getFrom();
            if (from != null && !from.isBlank()) {
                helper.setFrom(from);
            }
            if (html != null && !html.isBlank()) {
                helper.setText(text != null ? text : "", html);
            } else {
                helper.setText(text != null ? text : "");
            }
            mailSender.send(message);
            return DeliveryResult.ok();
        } catch (Exception ex) {
            return DeliveryResult.failed(ex.getMessage());
        }
    }
}
