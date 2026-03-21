package com.fawnix.crm.leads.scheduler;

import com.fawnix.crm.activities.entity.LeadActivityType;
import com.fawnix.crm.activities.service.LeadActivityService;
import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.leads.repository.LeadRepository;
import com.fawnix.crm.security.service.AppUserDetails;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class LeadFollowUpReminderScheduler {

  private static final Logger LOGGER = LoggerFactory.getLogger(LeadFollowUpReminderScheduler.class);
  private static final AppUserDetails SYSTEM_ACTOR = new AppUserDetails(
      "system-followup",
      "followup@fawnix.local",
      "Follow-up Reminder",
      List.of("ROLE_ADMIN"),
      List.of()
  );

  private final LeadRepository leadRepository;
  private final LeadActivityService leadActivityService;
  private final com.fawnix.crm.leads.service.LeadNotificationStreamService notificationStreamService;

  @Value("${app.leads.follow-up-reminders.enabled:true}")
  private boolean enabled;

  @Value("${app.leads.follow-up-reminders.lookahead-minutes:0}")
  private long lookaheadMinutes;

  public LeadFollowUpReminderScheduler(
      LeadRepository leadRepository,
      LeadActivityService leadActivityService,
      com.fawnix.crm.leads.service.LeadNotificationStreamService notificationStreamService
  ) {
    this.leadRepository = leadRepository;
    this.leadActivityService = leadActivityService;
    this.notificationStreamService = notificationStreamService;
  }

  @Scheduled(fixedDelayString = "${app.leads.follow-up-reminders.delay-ms:60000}")
  @Transactional
  public void sendFollowUpReminders() {
    if (!enabled) {
      return;
    }

    Instant cutoff = Instant.now().plus(lookaheadMinutes, ChronoUnit.MINUTES);
    List<LeadEntity> dueLeads = leadRepository.findLeadsNeedingFollowUp(cutoff);
    if (dueLeads.isEmpty()) {
      return;
    }

    Instant now = Instant.now();
    for (LeadEntity lead : dueLeads) {
      lead.setFollowUpReminderSentAt(now);
      String message = lead.getFollowUpAt() != null
          ? "Follow-up reminder due at " + lead.getFollowUpAt() + "."
          : "Follow-up reminder due.";
      leadActivityService.addActivity(lead, LeadActivityType.FOLLOW_UP_REMINDER, message, SYSTEM_ACTOR, now);
    }

    notificationStreamService.sendFollowUpReminder();
    LOGGER.info("Sent {} follow-up reminders.", dueLeads.size());
  }
}
