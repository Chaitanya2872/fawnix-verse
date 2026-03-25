package com.hirepath.notifications.service;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.stream.StreamListener;
import org.springframework.stereotype.Component;

@Component
public class OutboxStreamListener implements StreamListener<String, MapRecord<String, String, String>> {

    private static final Logger log = LoggerFactory.getLogger(OutboxStreamListener.class);

    private final OutboxProcessor processor;

    public OutboxStreamListener(OutboxProcessor processor) {
        this.processor = processor;
    }

    @Override
    public void onMessage(MapRecord<String, String, String> message) {
        String outboxId = message.getValue().get("outboxId");
        if (outboxId == null) {
            return;
        }
        try {
            processor.process(UUID.fromString(outboxId));
        } catch (Exception ex) {
            log.warn("Failed to process stream outbox {}: {}", outboxId, ex.getMessage());
        }
    }
}
