package com.fawnix.crm.activities.service;

import com.fawnix.crm.activities.entity.LeadActivityEntity;
import com.fawnix.crm.activities.entity.LeadActivityType;
import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.security.service.AppUserDetails;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class LeadActivityService {

  public LeadActivityEntity addActivity(
      LeadEntity lead,
      LeadActivityType activityType,
      String content,
      AppUserDetails actor,
      Instant createdAt
  ) {
    LeadActivityEntity activity = new LeadActivityEntity();
    activity.setId(UUID.randomUUID().toString());
    activity.setLead(lead);
    activity.setActivityType(activityType);
    activity.setContent(content);
    activity.setCreatedByUserId(actor.getUserId());
    activity.setCreatedByName(actor.getFullName());
    activity.setCreatedAt(createdAt);
    lead.getActivities().add(0, activity);
    return activity;
  }
}
