package com.hirepath.notifications.service;

import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.notifications.config.NotificationProperties;
import com.hirepath.notifications.domain.NotificationAttempt;
import com.hirepath.notifications.domain.NotificationAttemptStatus;
import com.hirepath.notifications.domain.NotificationChannel;
import com.hirepath.notifications.domain.NotificationDeadLetter;
import com.hirepath.notifications.domain.NotificationOutbox;
import com.hirepath.notifications.domain.NotificationOutboxStatus;
import com.hirepath.notifications.domain.NotificationRecipient;
import com.hirepath.notifications.domain.NotificationRecipientStatus;
import com.hirepath.notifications.repository.NotificationAttemptRepository;
import com.hirepath.notifications.repository.NotificationDeadLetterRepository;
import com.hirepath.notifications.repository.NotificationOutboxRepository;
import com.hirepath.notifications.repository.NotificationRecipientRepository;

import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OutboxProcessor {

    private static final Logger log = LoggerFactory.getLogger(OutboxProcessor.class);

    private final NotificationOutboxRepository outboxRepository;
    private final NotificationAttemptRepository attemptRepository;
    private final NotificationRecipientRepository recipientRepository;
    private final NotificationDeadLetterRepository deadLetterRepository;
    private final Map<NotificationChannel, NotificationChannelSender> senders;
    private final NotificationProperties properties;
    private final MeterRegistry meterRegistry;

    public OutboxProcessor(
        NotificationOutboxRepository outboxRepository,
        NotificationAttemptRepository attemptRepository,
        NotificationRecipientRepository recipientRepository,
        NotificationDeadLetterRepository deadLetterRepository,
        List<NotificationChannelSender> channelSenders,
        NotificationProperties properties,
        MeterRegistry meterRegistry
    ) {
        this.outboxRepository = outboxRepository;
        this.attemptRepository = attemptRepository;
        this.recipientRepository = recipientRepository;
        this.deadLetterRepository = deadLetterRepository;
        this.properties = properties;
        this.meterRegistry = meterRegistry;
        this.senders = new EnumMap<>(NotificationChannel.class);
        for (NotificationChannelSender sender : channelSenders) {
            this.senders.put(sender.channel(), sender);
        }
    }

    public void process(UUID outboxId) {
        NotificationOutbox outbox = outboxRepository.findById(outboxId).orElse(null);
        if (outbox == null) {
            return;
        }
        if (outbox.getStatus() == NotificationOutboxStatus.SENT || outbox.getStatus() == NotificationOutboxStatus.DEAD) {
            return;
        }
        if (outbox.getNextRetryAt() != null && outbox.getNextRetryAt().isAfter(OffsetDateTime.now())) {
            return;
        }

        outbox.setStatus(NotificationOutboxStatus.PROCESSING);
        outboxRepository.save(outbox);

        NotificationChannelSender sender = senders.get(outbox.getChannel());
        DeliveryResult result;
        if (sender == null) {
            result = DeliveryResult.failed("No sender for channel");
        } else {
            try {
                result = sender.send(outbox.getNotification(), outbox.getRecipient());
            } catch (Exception ex) {
                result = DeliveryResult.failed(ex.getMessage());
            }
        }

        NotificationAttempt attempt = new NotificationAttempt();
        attempt.setRecipient(outbox.getRecipient());
        attempt.setChannel(outbox.getChannel());
        attempt.setRetryCount(outbox.getAttempts());
        attempt.setNextRetryAt(outbox.getNextRetryAt());

        if (result.isSuccess()) {
            attempt.setStatus(NotificationAttemptStatus.SUCCESS);
            attempt.setSentAt(OffsetDateTime.now());
            outbox.setStatus(NotificationOutboxStatus.SENT);
            outbox.setLastError(null);
            meterRegistry.counter("notifications.sent", "channel", outbox.getChannel().name()).increment();
        } else {
            attempt.setStatus(NotificationAttemptStatus.FAILED);
            attempt.setError(result.getError());
            outbox.setAttempts(outbox.getAttempts() + 1);
            outbox.setLastError(result.getError());
            meterRegistry.counter("notifications.failed", "channel", outbox.getChannel().name()).increment();
            if (outbox.getAttempts() >= properties.getRetries().getMaxAttempts()) {
                outbox.setStatus(NotificationOutboxStatus.DEAD);
                NotificationDeadLetter dead = new NotificationDeadLetter();
                dead.setOutbox(outbox);
                dead.setReason(result.getError());
                dead.setPayload("channel=" + outbox.getChannel().name());
                deadLetterRepository.save(dead);
            } else {
                outbox.setStatus(NotificationOutboxStatus.FAILED);
                OffsetDateTime nextRetry = nextRetry(outbox.getAttempts());
                outbox.setNextRetryAt(nextRetry);
                attempt.setNextRetryAt(nextRetry);
            }
        }

        attemptRepository.save(attempt);
        outboxRepository.save(outbox);
        updateRecipientStatus(outbox.getRecipient());
    }

    @Scheduled(fixedDelayString = "${notifications.outbox.scan-ms:10000}")
    public void processDue() {
        List<NotificationOutbox> due = outboxRepository.findDueOutbox(
            List.of(NotificationOutboxStatus.PENDING, NotificationOutboxStatus.FAILED),
            OffsetDateTime.now()
        );
        for (NotificationOutbox outbox : due) {
            try {
                process(outbox.getId());
            } catch (Exception ex) {
                log.warn("Failed to process outbox {}: {}", outbox.getId(), ex.getMessage());
            }
        }
    }

    private OffsetDateTime nextRetry(int attempts) {
        int base = properties.getRetries().getBaseDelaySeconds();
        int delay = base * Math.max(1, attempts);
        return OffsetDateTime.now().plusSeconds(delay);
    }

    private void updateRecipientStatus(NotificationRecipient recipient) {
        if (recipient.getStatus() == NotificationRecipientStatus.READ) {
            return;
        }
        List<NotificationOutbox> outboxes = outboxRepository.findByRecipient_Id(recipient.getId());
        boolean anyDead = outboxes.stream().anyMatch(o -> o.getStatus() == NotificationOutboxStatus.DEAD);
        boolean allSent = !outboxes.isEmpty() && outboxes.stream().allMatch(o -> o.getStatus() == NotificationOutboxStatus.SENT);
        if (anyDead) {
            recipient.setStatus(NotificationRecipientStatus.FAILED);
        } else if (allSent) {
            recipient.setStatus(NotificationRecipientStatus.SENT);
        } else {
            recipient.setStatus(NotificationRecipientStatus.PENDING);
        }
        recipientRepository.save(recipient);
    }
}
