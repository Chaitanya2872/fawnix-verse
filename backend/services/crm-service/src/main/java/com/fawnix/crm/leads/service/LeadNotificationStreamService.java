package com.fawnix.crm.leads.service;

import com.fawnix.crm.leads.dto.LeadDtos;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class LeadNotificationStreamService {

  private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

  public SseEmitter subscribe() {
    SseEmitter emitter = new SseEmitter(0L);
    emitters.add(emitter);
    emitter.onCompletion(() -> emitters.remove(emitter));
    emitter.onTimeout(() -> emitters.remove(emitter));
    emitter.onError((ex) -> emitters.remove(emitter));
    return emitter;
  }

  public void sendLeadCreated() {
    sendEvent(new LeadDtos.LeadNotificationEvent("LEAD_CREATED", Instant.now()));
  }

  public void sendFollowUpReminder() {
    sendEvent(new LeadDtos.LeadNotificationEvent("FOLLOW_UP_DUE", Instant.now()));
  }

  private void sendEvent(LeadDtos.LeadNotificationEvent event) {
    for (SseEmitter emitter : emitters) {
      try {
        emitter.send(SseEmitter.event().name(event.type()).data(event));
      } catch (Exception ex) {
        emitters.remove(emitter);
      }
    }
  }
}
