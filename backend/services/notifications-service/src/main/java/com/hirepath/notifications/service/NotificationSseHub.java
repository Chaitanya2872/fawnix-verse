package com.hirepath.notifications.service;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Component
public class NotificationSseHub {

    private static final Logger log = LoggerFactory.getLogger(NotificationSseHub.class);

    private final Map<UUID, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter register(UUID userId) {
        SseEmitter emitter = new SseEmitter(Duration.ofMinutes(30).toMillis());
        emitters.computeIfAbsent(userId, key -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(ex -> remove(userId, emitter));
        return emitter;
    }

    public void emit(UUID userId, Object payload) {
        List<SseEmitter> list = emitters.get(userId);
        if (list == null) {
            return;
        }
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(payload));
            } catch (IOException ex) {
                log.debug("SSE emit failed: {}", ex.getMessage());
                remove(userId, emitter);
            }
        }
    }

    private void remove(UUID userId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(userId);
        if (list == null) {
            return;
        }
        list.remove(emitter);
        if (list.isEmpty()) {
            emitters.remove(userId);
        }
    }
}
