package com.fawnix.verse.activities.service;

import com.fawnix.verse.activities.entity.LeadActivityEntity;
import com.fawnix.verse.activities.entity.LeadActivityType;
import com.fawnix.verse.leads.entity.LeadEntity;
import com.fawnix.verse.users.entity.UserEntity;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class LeadActivityService {

  public LeadActivityEntity addActivity(
      LeadEntity lead,
      LeadActivityType activityType,
      String content,
      UserEntity actor,
      Instant createdAt
  ) {
    LeadActivityEntity activity = new LeadActivityEntity();
    activity.setId(UUID.randomUUID().toString());
    activity.setLead(lead);
    activity.setActivityType(activityType);
    activity.setContent(content);
    activity.setCreatedByUser(actor);
    activity.setCreatedAt(createdAt);
    lead.getActivities().add(0, activity);
    return activity;
  }
}
