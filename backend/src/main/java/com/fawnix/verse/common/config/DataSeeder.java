package com.fawnix.verse.common.config;

import com.fawnix.verse.activities.entity.LeadActivityType;
import com.fawnix.verse.auth.entity.RoleEntity;
import com.fawnix.verse.auth.entity.RoleName;
import com.fawnix.verse.auth.repository.RoleRepository;
import com.fawnix.verse.leads.entity.LeadEntity;
import com.fawnix.verse.leads.entity.LeadPriority;
import com.fawnix.verse.leads.entity.LeadSource;
import com.fawnix.verse.leads.entity.LeadStatus;
import com.fawnix.verse.leads.entity.LeadTagEntity;
import com.fawnix.verse.leads.repository.LeadRepository;
import com.fawnix.verse.remarks.entity.LeadRemarkEntity;
import com.fawnix.verse.remarks.entity.LeadRemarkVersionEntity;
import com.fawnix.verse.users.entity.UserEntity;
import com.fawnix.verse.users.repository.UserRepository;
import com.fawnix.verse.activities.entity.LeadActivityEntity;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataSeeder implements ApplicationRunner {

  private final RoleRepository roleRepository;
  private final UserRepository userRepository;
  private final LeadRepository leadRepository;
  private final PasswordEncoder passwordEncoder;

  @Value("${app.security.dev-admin-email}")
  private String devAdminEmail;

  @Value("${app.security.dev-admin-password}")
  private String devAdminPassword;

  public DataSeeder(
      RoleRepository roleRepository,
      UserRepository userRepository,
      LeadRepository leadRepository,
      PasswordEncoder passwordEncoder
  ) {
    this.roleRepository = roleRepository;
    this.userRepository = userRepository;
    this.leadRepository = leadRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    Map<String, RoleEntity> roles = ensureRoles();
    Map<String, UserEntity> users = ensureUsers(roles);
    if (leadRepository.count() == 0) {
      seedLeads(users);
    }
  }

  private Map<String, RoleEntity> ensureRoles() {
    Instant now = Instant.now();
    Map<String, RoleEntity> roles = new LinkedHashMap<>();
    for (RoleName roleName : RoleName.values()) {
      RoleEntity role = roleRepository.findByName(roleName.name())
          .orElseGet(() -> roleRepository.save(new RoleEntity(
              UUID.randomUUID().toString(),
              roleName.name(),
              now
          )));
      roles.put(roleName.name(), role);
    }
    return roles;
  }

  private Map<String, UserEntity> ensureUsers(Map<String, RoleEntity> roles) {
    Map<String, UserEntity> users = new LinkedHashMap<>();
    users.put("Admin User", ensureUser("Admin User", devAdminEmail, devAdminPassword, Set.of(roles.get(RoleName.ROLE_ADMIN.name()))));
    users.put("Mia Thompson", ensureUser("Mia Thompson", "manager@fawnix.com", "Manager@123", Set.of(roles.get(RoleName.ROLE_SALES_MANAGER.name()))));
    users.put("Sarah Kim", ensureUser("Sarah Kim", "sarah.kim@fawnix.com", "Sales@123", Set.of(roles.get(RoleName.ROLE_SALES_REP.name()))));
    users.put("Mike Rodriguez", ensureUser("Mike Rodriguez", "mike.rodriguez@fawnix.com", "Sales@123", Set.of(roles.get(RoleName.ROLE_SALES_REP.name()))));
    users.put("James Lee", ensureUser("James Lee", "james.lee@fawnix.com", "Sales@123", Set.of(roles.get(RoleName.ROLE_SALES_REP.name()))));
    users.put("Priya Singh", ensureUser("Priya Singh", "priya.singh@fawnix.com", "Sales@123", Set.of(roles.get(RoleName.ROLE_SALES_REP.name()))));
    users.put("Alex Johnson", ensureUser("Alex Johnson", "alex.johnson@fawnix.com", "Sales@123", Set.of(roles.get(RoleName.ROLE_SALES_REP.name()))));
    users.put("Emma Davis", ensureUser("Emma Davis", "emma.davis@fawnix.com", "Sales@123", Set.of(roles.get(RoleName.ROLE_SALES_REP.name()))));
    return users;
  }

  private UserEntity ensureUser(String fullName, String email, String rawPassword, Set<RoleEntity> roles) {
    return userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
      Instant now = Instant.now();
      UserEntity user = new UserEntity(
          UUID.randomUUID().toString(),
          fullName,
          email,
          passwordEncoder.encode(rawPassword),
          true,
          now,
          now
      );
      user.setRoles(roles);
      return userRepository.save(user);
    });
  }

  private void seedLeads(Map<String, UserEntity> users) {
    UserEntity admin = users.get("Admin User");
    leadRepository.saveAll(List.of(
        buildLead("Jordan Pierce", "Nexaflow Inc.", "jordan@nexaflow.com", "+1 (555) 201-4432", LeadStatus.NEW, LeadSource.WEBSITE, LeadPriority.HIGH, users.get("Sarah Kim"), new BigDecimal("48000"), List.of("enterprise", "saas"), "Interested in enterprise plan. Mentioned scaling to 200 seats.", null, null, instant("2024-03-01T09:15:00Z"), instant("2024-03-01T09:15:00Z"), admin),
        buildLead("Camille Dupont", "Lumiere Digital", "c.dupont@lumiere.fr", "+33 6 12 34 56 78", LeadStatus.CONTACTED, LeadSource.REFERRAL, LeadPriority.MEDIUM, users.get("Mike Rodriguez"), new BigDecimal("22000"), List.of("referral", "europe"), "Referral from Acme Corp. Had initial discovery call on March 3rd.", instant("2024-03-03T14:00:00Z"), null, instant("2024-03-02T10:00:00Z"), instant("2024-03-03T14:30:00Z"), admin),
        buildLead("Raj Mehta", "Stackwise Solutions", "raj.mehta@stackwise.io", "+91 98765 43210", LeadStatus.QUALIFIED, LeadSource.EVENT, LeadPriority.HIGH, users.get("James Lee"), new BigDecimal("95000"), List.of("hot", "event"), "Met at SaaSWorld 2024. Strong budget alignment. Decision maker confirmed.", instant("2024-03-05T11:00:00Z"), null, instant("2024-03-03T08:00:00Z"), instant("2024-03-05T11:30:00Z"), admin),
        buildLead("Sofia Andersen", "NordTech AS", "sofia@nordtech.no", "+47 400 12 345", LeadStatus.PROPOSAL_SENT, LeadSource.COLD_CALL, LeadPriority.HIGH, users.get("Priya Singh"), new BigDecimal("67000"), List.of("proposal", "nordic"), "Proposal sent March 8th. Follow-up scheduled for March 15th.", instant("2024-03-08T09:00:00Z"), null, instant("2024-03-04T13:00:00Z"), instant("2024-03-08T09:15:00Z"), admin),
        buildLead("Marcus Webb", "BlueHill Ventures", "m.webb@bluehill.vc", "+1 (415) 888-2210", LeadStatus.CONVERTED, LeadSource.REFERRAL, LeadPriority.HIGH, users.get("Sarah Kim"), new BigDecimal("150000"), List.of("converted", "vc"), "Converted to opportunity. Contract under legal review.", instant("2024-03-10T15:00:00Z"), instant("2024-03-10T15:00:00Z"), instant("2024-02-20T09:00:00Z"), instant("2024-03-10T15:05:00Z"), admin),
        buildLead("Yuki Tanaka", "Shiro Systems", "y.tanaka@shiro.jp", "+81 3-1234-5678", LeadStatus.LOST, LeadSource.EMAIL, LeadPriority.LOW, users.get("Alex Johnson"), new BigDecimal("18000"), List.of("lost", "apac"), "Went with competitor. Price was the deciding factor.", instant("2024-03-07T10:00:00Z"), null, instant("2024-02-25T11:00:00Z"), instant("2024-03-07T10:30:00Z"), admin),
        buildLead("Elena Vasquez", "Solara Energy", "elena@solaraenergy.com", "+34 612 345 678", LeadStatus.NEW, LeadSource.SOCIAL, LeadPriority.MEDIUM, users.get("Emma Davis"), new BigDecimal("34000"), List.of("social", "energy"), "Came via LinkedIn. Interested in mid-market plan.", null, null, instant("2024-03-09T14:00:00Z"), instant("2024-03-09T14:00:00Z"), admin),
        buildLead("Kwame Asante", "Accra Tech Hub", "kwame@accratech.gh", "+233 24 123 4567", LeadStatus.CONTACTED, LeadSource.WEBSITE, LeadPriority.MEDIUM, users.get("Mike Rodriguez"), new BigDecimal("29000"), List.of("trial", "africa"), "Signed up for free trial. Needs API access discussion.", instant("2024-03-11T09:00:00Z"), null, instant("2024-03-10T08:00:00Z"), instant("2024-03-11T09:20:00Z"), admin),
        buildLead("Isabelle Moreau", "CloudPeak SAS", "i.moreau@cloudpeak.fr", "+33 7 98 76 54 32", LeadStatus.QUALIFIED, LeadSource.REFERRAL, LeadPriority.HIGH, users.get("James Lee"), new BigDecimal("82000"), List.of("compliance", "qualified"), "Strong fit. Needs SSO and compliance docs before moving forward.", instant("2024-03-12T11:00:00Z"), null, instant("2024-03-08T10:00:00Z"), instant("2024-03-12T11:45:00Z"), admin),
        buildLead("Daniel Foster", "Horizon Analytics", "dfoster@horizonai.com", "+1 (312) 555-7890", LeadStatus.NEW, LeadSource.EVENT, LeadPriority.LOW, users.get("Priya Singh"), new BigDecimal("11000"), List.of("early", "analytics"), "Business card from SaaStr. Early stage inquiry.", null, null, instant("2024-03-12T16:00:00Z"), instant("2024-03-12T16:00:00Z"), admin),
        buildLead("Amara Osei", "Kente Digital", "amara@kentedigital.com", "+233 50 987 6543", LeadStatus.PROPOSAL_SENT, LeadSource.COLD_CALL, LeadPriority.MEDIUM, users.get("Emma Davis"), new BigDecimal("41000"), List.of("proposal"), "Custom proposal for 80 seats. Awaiting board approval.", instant("2024-03-13T10:00:00Z"), null, instant("2024-03-06T09:00:00Z"), instant("2024-03-13T10:30:00Z"), admin),
        buildLead("Luca Bianchi", "Roma Cloud Srl", "l.bianchi@romacloud.it", "+39 06 1234 5678", LeadStatus.CONTACTED, LeadSource.EMAIL, LeadPriority.LOW, users.get("Alex Johnson"), new BigDecimal("14000"), List.of("demo", "italy"), "Responded to outbound campaign. Requested a demo.", instant("2024-03-13T14:00:00Z"), null, instant("2024-03-11T12:00:00Z"), instant("2024-03-13T14:10:00Z"), admin)
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
      UserEntity assignedTo,
      BigDecimal estimatedValue,
      List<String> tags,
      String notes,
      Instant lastContactedAt,
      Instant convertedAt,
      Instant createdAt,
      Instant updatedAt,
      UserEntity actor
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
    lead.setAssignedToUser(assignedTo);
    lead.setEstimatedValue(estimatedValue);
    lead.setNotes(notes);
    lead.setLastContactedAt(lastContactedAt);
    lead.setConvertedAt(convertedAt);
    lead.setCreatedAt(createdAt);
    lead.setUpdatedAt(updatedAt);
    lead.setCreatedByUser(actor);
    lead.setUpdatedByUser(actor);

    for (String tag : tags) {
      lead.getTags().add(new LeadTagEntity(UUID.randomUUID().toString(), lead, tag, createdAt));
    }

    if (notes != null && !notes.isBlank()) {
      LeadRemarkEntity remark = new LeadRemarkEntity();
      remark.setId(UUID.randomUUID().toString());
      remark.setLead(lead);
      remark.setCreatedByUser(actor);
      remark.setUpdatedByUser(actor);
      remark.setCreatedAt(createdAt);
      remark.setUpdatedAt(createdAt);

      LeadRemarkVersionEntity version = new LeadRemarkVersionEntity();
      version.setId(UUID.randomUUID().toString());
      version.setRemark(remark);
      version.setContent(notes);
      version.setCreatedByUser(actor);
      version.setCreatedAt(createdAt);
      remark.getVersions().add(version);
      lead.getRemarks().add(remark);

      lead.getActivities().add(activity(lead, LeadActivityType.REMARK_ADDED, "Added the initial lead remark.", actor, createdAt));
    }

    if (status != LeadStatus.NEW) {
      Instant statusTime = convertedAt != null ? convertedAt : lastContactedAt != null ? lastContactedAt : updatedAt;
      lead.getActivities().add(activity(lead, LeadActivityType.STATUS_CHANGE, "Lead moved to " + prettyStatus(status) + ".", actor, statusTime));
    }

    if (lastContactedAt != null) {
      lead.getActivities().add(activity(lead, LeadActivityType.CALL, "Lead was contacted.", actor, lastContactedAt));
    }

    if (convertedAt != null) {
      lead.getActivities().add(activity(lead, LeadActivityType.CONVERTED, "Lead converted to opportunity.", actor, convertedAt));
    }

    lead.getActivities().sort((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()));
    return lead;
  }

  private LeadActivityEntity activity(
      LeadEntity lead,
      LeadActivityType type,
      String content,
      UserEntity actor,
      Instant createdAt
  ) {
    LeadActivityEntity activity = new LeadActivityEntity();
    activity.setId(UUID.randomUUID().toString());
    activity.setLead(lead);
    activity.setActivityType(type);
    activity.setContent(content);
    activity.setCreatedByUser(actor);
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
