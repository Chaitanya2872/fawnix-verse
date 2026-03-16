package com.fawnix.crm.common.config;

import com.fawnix.crm.activities.entity.LeadActivityEntity;
import com.fawnix.crm.activities.entity.LeadActivityType;
import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.leads.entity.LeadPriority;
import com.fawnix.crm.leads.entity.LeadSource;
import com.fawnix.crm.leads.entity.LeadStatus;
import com.fawnix.crm.leads.entity.LeadTagEntity;
import com.fawnix.crm.leads.repository.LeadRepository;
import com.fawnix.crm.remarks.entity.LeadRemarkEntity;
import com.fawnix.crm.remarks.entity.LeadRemarkVersionEntity;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataSeeder implements ApplicationRunner {

  private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
  private static final String ADMIN_NAME = "Admin User";
  private static final String SALES_MANAGER_ID = "22222222-2222-2222-2222-222222222222";
  private static final String SALES_MANAGER_NAME = "Mia Thompson";
  private static final String SARAH_KIM_ID = "33333333-3333-3333-3333-333333333333";
  private static final String SARAH_KIM_NAME = "Sarah Kim";
  private static final String MIKE_RODRIGUEZ_ID = "44444444-4444-4444-4444-444444444444";
  private static final String MIKE_RODRIGUEZ_NAME = "Mike Rodriguez";
  private static final String JAMES_LEE_ID = "55555555-5555-5555-5555-555555555555";
  private static final String JAMES_LEE_NAME = "James Lee";
  private static final String PRIYA_SINGH_ID = "66666666-6666-6666-6666-666666666666";
  private static final String PRIYA_SINGH_NAME = "Priya Singh";
  private static final String ALEX_JOHNSON_ID = "77777777-7777-7777-7777-777777777777";
  private static final String ALEX_JOHNSON_NAME = "Alex Johnson";
  private static final String EMMA_DAVIS_ID = "88888888-8888-8888-8888-888888888888";
  private static final String EMMA_DAVIS_NAME = "Emma Davis";

  private final LeadRepository leadRepository;

  public DataSeeder(LeadRepository leadRepository) {
    this.leadRepository = leadRepository;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (leadRepository.count() > 0) {
      return;
    }

    leadRepository.saveAll(List.of(
        buildLead("Jordan Pierce", "Nexaflow Inc.", "jordan@nexaflow.com", "+1 (555) 201-4432", LeadStatus.NEW, LeadSource.WEBSITE, LeadPriority.HIGH, SARAH_KIM_ID, SARAH_KIM_NAME, new BigDecimal("48000"), List.of("enterprise", "saas"), "Interested in enterprise plan. Mentioned scaling to 200 seats.", null, null, instant("2024-03-01T09:15:00Z"), instant("2024-03-01T09:15:00Z")),
        buildLead("Camille Dupont", "Lumiere Digital", "c.dupont@lumiere.fr", "+33 6 12 34 56 78", LeadStatus.CONTACTED, LeadSource.REFERRAL, LeadPriority.MEDIUM, MIKE_RODRIGUEZ_ID, MIKE_RODRIGUEZ_NAME, new BigDecimal("22000"), List.of("referral", "europe"), "Referral from Acme Corp. Had initial discovery call on March 3rd.", instant("2024-03-03T14:00:00Z"), null, instant("2024-03-02T10:00:00Z"), instant("2024-03-03T14:30:00Z")),
        buildLead("Raj Mehta", "Stackwise Solutions", "raj.mehta@stackwise.io", "+91 98765 43210", LeadStatus.ASSIGNED_TO_SALESPERSON, LeadSource.EVENT, LeadPriority.HIGH, JAMES_LEE_ID, JAMES_LEE_NAME, new BigDecimal("95000"), List.of("hot", "event"), "Met at SaaSWorld 2024. Strong budget alignment. Decision maker confirmed.", instant("2024-03-05T11:00:00Z"), null, instant("2024-03-03T08:00:00Z"), instant("2024-03-05T11:30:00Z")),
        buildLead("Sofia Andersen", "NordTech AS", "sofia@nordtech.no", "+47 400 12 345", LeadStatus.PROPOSAL_SENT, LeadSource.COLD_CALL, LeadPriority.HIGH, PRIYA_SINGH_ID, PRIYA_SINGH_NAME, new BigDecimal("67000"), List.of("proposal", "nordic"), "Proposal sent March 8th. Follow-up scheduled for March 15th.", instant("2024-03-08T09:00:00Z"), null, instant("2024-03-04T13:00:00Z"), instant("2024-03-08T09:15:00Z")),
        buildLead("Marcus Webb", "BlueHill Ventures", "m.webb@bluehill.vc", "+1 (415) 888-2210", LeadStatus.CONVERTED, LeadSource.REFERRAL, LeadPriority.HIGH, SARAH_KIM_ID, SARAH_KIM_NAME, new BigDecimal("150000"), List.of("converted", "vc"), "Converted to opportunity. Contract under legal review.", instant("2024-03-10T15:00:00Z"), instant("2024-03-10T15:00:00Z"), instant("2024-02-20T09:00:00Z"), instant("2024-03-10T15:05:00Z")),
        buildLead("Yuki Tanaka", "Shiro Systems", "y.tanaka@shiro.jp", "+81 3-1234-5678", LeadStatus.LOST, LeadSource.EMAIL, LeadPriority.LOW, ALEX_JOHNSON_ID, ALEX_JOHNSON_NAME, new BigDecimal("18000"), List.of("lost", "apac"), "Went with competitor. Price was the deciding factor.", instant("2024-03-07T10:00:00Z"), null, instant("2024-02-25T11:00:00Z"), instant("2024-03-07T10:30:00Z")),
        buildLead("Elena Vasquez", "Solara Energy", "elena@solaraenergy.com", "+34 612 345 678", LeadStatus.NEW, LeadSource.SOCIAL, LeadPriority.MEDIUM, EMMA_DAVIS_ID, EMMA_DAVIS_NAME, new BigDecimal("34000"), List.of("social", "energy"), "Came via LinkedIn. Interested in mid-market plan.", null, null, instant("2024-03-09T14:00:00Z"), instant("2024-03-09T14:00:00Z")),
        buildLead("Kwame Asante", "Accra Tech Hub", "kwame@accratech.gh", "+233 24 123 4567", LeadStatus.FOLLOW_UP, LeadSource.WEBSITE, LeadPriority.MEDIUM, MIKE_RODRIGUEZ_ID, MIKE_RODRIGUEZ_NAME, new BigDecimal("29000"), List.of("trial", "africa"), "Signed up for free trial. Needs API access discussion.", instant("2024-03-11T09:00:00Z"), null, instant("2024-03-10T08:00:00Z"), instant("2024-03-11T09:20:00Z")),
        buildLead("Isabelle Moreau", "CloudPeak SAS", "i.moreau@cloudpeak.fr", "+33 7 98 76 54 32", LeadStatus.QUALIFIED, LeadSource.REFERRAL, LeadPriority.HIGH, JAMES_LEE_ID, JAMES_LEE_NAME, new BigDecimal("82000"), List.of("compliance", "qualified"), "Strong fit. Needs SSO and compliance docs before moving forward.", instant("2024-03-12T11:00:00Z"), null, instant("2024-03-08T10:00:00Z"), instant("2024-03-12T11:45:00Z")),
        buildLead("Daniel Foster", "Horizon Analytics", "dfoster@horizonai.com", "+1 (312) 555-7890", LeadStatus.NEW, LeadSource.EVENT, LeadPriority.LOW, PRIYA_SINGH_ID, PRIYA_SINGH_NAME, new BigDecimal("11000"), List.of("early", "analytics"), "Business card from SaaStr. Early stage inquiry.", null, null, instant("2024-03-12T16:00:00Z"), instant("2024-03-12T16:00:00Z")),
        buildLead("Amara Osei", "Kente Digital", "amara@kentedigital.com", "+233 50 987 6543", LeadStatus.PROPOSAL_SENT, LeadSource.COLD_CALL, LeadPriority.MEDIUM, EMMA_DAVIS_ID, EMMA_DAVIS_NAME, new BigDecimal("41000"), List.of("proposal"), "Custom proposal for 80 seats. Awaiting board approval.", instant("2024-03-13T10:00:00Z"), null, instant("2024-03-06T09:00:00Z"), instant("2024-03-13T10:30:00Z")),
        buildLead("Luca Bianchi", "Roma Cloud Srl", "l.bianchi@romacloud.it", "+39 06 1234 5678", LeadStatus.UNQUALIFIED, LeadSource.EMAIL, LeadPriority.LOW, ALEX_JOHNSON_ID, ALEX_JOHNSON_NAME, new BigDecimal("14000"), List.of("demo", "italy"), "Responded to outbound campaign. Requested a demo.", instant("2024-03-13T14:00:00Z"), null, instant("2024-03-11T12:00:00Z"), instant("2024-03-13T14:10:00Z"))
    ));
  }

  private LeadEntity buildLead(
      String name,
      String company,
      String email,
      String phone,
      LeadStatus status,
      LeadSource source,
      LeadPriority priority,
      String assignedToUserId,
      String assignedToName,
      BigDecimal estimatedValue,
      List<String> tags,
      String notes,
      Instant lastContactedAt,
      Instant convertedAt,
      Instant createdAt,
      Instant updatedAt
  ) {
    LeadEntity lead = new LeadEntity();
    lead.setId(UUID.randomUUID().toString());
    lead.setName(name);
    lead.setCompany(company);
    lead.setEmail(email);
    lead.setPhone(phone);
    lead.setStatus(status);
    lead.setSource(source);
    lead.setPriority(priority);
    lead.setAssignedToUserId(assignedToUserId);
    lead.setAssignedToName(assignedToName);
    lead.setEstimatedValue(estimatedValue);
    lead.setNotes(notes);
    lead.setLastContactedAt(lastContactedAt);
    lead.setConvertedAt(convertedAt);
    lead.setCreatedAt(createdAt);
    lead.setUpdatedAt(updatedAt);
    lead.setCreatedByUserId(ADMIN_ID);
    lead.setCreatedByName(ADMIN_NAME);
    lead.setUpdatedByUserId(ADMIN_ID);
    lead.setUpdatedByName(ADMIN_NAME);

    for (String tag : tags) {
      lead.getTags().add(new LeadTagEntity(UUID.randomUUID().toString(), lead, tag, createdAt));
    }

    if (notes != null && !notes.isBlank()) {
      LeadRemarkEntity remark = new LeadRemarkEntity();
      remark.setId(UUID.randomUUID().toString());
      remark.setLead(lead);
      remark.setCreatedByUserId(ADMIN_ID);
      remark.setCreatedByName(ADMIN_NAME);
      remark.setUpdatedByUserId(ADMIN_ID);
      remark.setUpdatedByName(ADMIN_NAME);
      remark.setCreatedAt(createdAt);
      remark.setUpdatedAt(createdAt);

      LeadRemarkVersionEntity version = new LeadRemarkVersionEntity();
      version.setId(UUID.randomUUID().toString());
      version.setRemark(remark);
      version.setContent(notes);
      version.setCreatedByUserId(ADMIN_ID);
      version.setCreatedByName(ADMIN_NAME);
      version.setCreatedAt(createdAt);
      remark.getVersions().add(version);
      lead.getRemarks().add(remark);

      lead.getActivities().add(activity(lead, LeadActivityType.REMARK_ADDED, "Added the initial lead remark.", ADMIN_ID, ADMIN_NAME, createdAt));
    }

    if (status != LeadStatus.NEW) {
      Instant statusTime = convertedAt != null ? convertedAt : lastContactedAt != null ? lastContactedAt : updatedAt;
      lead.getActivities().add(activity(lead, LeadActivityType.STATUS_CHANGE, "Lead moved to " + prettyStatus(status) + ".", ADMIN_ID, ADMIN_NAME, statusTime));
    }

    if (lastContactedAt != null) {
      lead.getActivities().add(activity(lead, LeadActivityType.CALL, "Lead was contacted.", ADMIN_ID, ADMIN_NAME, lastContactedAt));
    }

    if (convertedAt != null) {
      lead.getActivities().add(activity(lead, LeadActivityType.CONVERTED, "Lead converted to opportunity.", ADMIN_ID, ADMIN_NAME, convertedAt));
    }

    lead.getActivities().sort((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()));
    return lead;
  }

  private LeadActivityEntity activity(
      LeadEntity lead,
      LeadActivityType type,
      String content,
      String createdByUserId,
      String createdByName,
      Instant createdAt
  ) {
    LeadActivityEntity activity = new LeadActivityEntity();
    activity.setId(UUID.randomUUID().toString());
    activity.setLead(lead);
    activity.setActivityType(type);
    activity.setContent(content);
    activity.setCreatedByUserId(createdByUserId);
    activity.setCreatedByName(createdByName);
    activity.setCreatedAt(createdAt);
    return activity;
  }

  private Instant instant(String value) {
    return Instant.parse(value);
  }

  private String prettyStatus(LeadStatus status) {
    String lower = status.name().toLowerCase().replace('_', ' ');
    return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
  }
}
