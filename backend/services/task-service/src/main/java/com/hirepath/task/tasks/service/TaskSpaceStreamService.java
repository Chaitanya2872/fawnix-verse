package com.hirepath.task.tasks.service;

import com.hirepath.task.tasks.dto.TaskDtos;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class TaskSpaceStreamService {

  private final Map<String, List<SseEmitter>> emittersByUser = new ConcurrentHashMap<>();

  public SseEmitter subscribe(String userId) {
    SseEmitter emitter = new SseEmitter(0L);
    emittersByUser.computeIfAbsent(userId, key -> new CopyOnWriteArrayList<>()).add(emitter);
    emitter.onCompletion(() -> remove(userId, emitter));
    emitter.onTimeout(() -> remove(userId, emitter));
    emitter.onError((ex) -> remove(userId, emitter));
    return emitter;
  }

  public void publishInvitation(String userId, String type, String spaceId, String invitationId) {
    sendToUser(userId, new TaskDtos.TaskStreamEvent(type, spaceId, invitationId, Instant.now()));
  }

  public void publishSpaceUpdate(String userId, String type, String spaceId) {
    sendToUser(userId, new TaskDtos.TaskStreamEvent(type, spaceId, null, Instant.now()));
  }

  private void sendToUser(String userId, TaskDtos.TaskStreamEvent event) {
    for (SseEmitter emitter : emittersByUser.getOrDefault(userId, List.of())) {
      try {
        emitter.send(SseEmitter.event().name(event.type()).data(event));
      } catch (IOException ex) {
        remove(userId, emitter);
      }
    }
  }

  private void remove(String userId, SseEmitter emitter) {
    List<SseEmitter> emitters = emittersByUser.get(userId);
    if (emitters == null) {
      return;
    }
    emitters.remove(emitter);
    if (emitters.isEmpty()) {
      emittersByUser.remove(userId);
    }
  }
}
