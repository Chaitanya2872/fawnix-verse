package com.fawnix.identity.common.config;

import com.fawnix.identity.auth.entity.RoleEntity;
import com.fawnix.identity.auth.entity.RoleName;
import com.fawnix.identity.auth.repository.RoleRepository;
import com.fawnix.identity.users.entity.UserEntity;
import com.fawnix.identity.users.repository.UserRepository;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
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

  public static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
  public static final String SALES_MANAGER_ID = "22222222-2222-2222-2222-222222222222";
  public static final String SARAH_KIM_ID = "33333333-3333-3333-3333-333333333333";
  public static final String MIKE_RODRIGUEZ_ID = "44444444-4444-4444-4444-444444444444";
  public static final String JAMES_LEE_ID = "55555555-5555-5555-5555-555555555555";
  public static final String PRIYA_SINGH_ID = "66666666-6666-6666-6666-666666666666";
  public static final String ALEX_JOHNSON_ID = "77777777-7777-7777-7777-777777777777";
  public static final String EMMA_DAVIS_ID = "88888888-8888-8888-8888-888888888888";

  private final RoleRepository roleRepository;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  @Value("${app.security.dev-admin-email}")
  private String devAdminEmail;

  @Value("${app.security.dev-admin-password}")
  private String devAdminPassword;

  public DataSeeder(
      RoleRepository roleRepository,
      UserRepository userRepository,
      PasswordEncoder passwordEncoder
  ) {
    this.roleRepository = roleRepository;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    Map<String, RoleEntity> roles = ensureRoles();
    ensureUsers(roles);
  }

  private Map<String, RoleEntity> ensureRoles() {
    Instant now = Instant.now();
    Map<String, RoleEntity> roles = new LinkedHashMap<>();
    for (RoleName roleName : RoleName.values()) {
      RoleEntity role = roleRepository.findByName(roleName.name())
          .orElseGet(() -> roleRepository.save(new RoleEntity(
              roleId(roleName),
              roleName.name(),
              now
          )));
      roles.put(roleName.name(), role);
    }
    return roles;
  }

  private void ensureUsers(Map<String, RoleEntity> roles) {
    ensureUser(ADMIN_ID, "Admin User", devAdminEmail, devAdminPassword, Set.of(roles.get(RoleName.ROLE_ADMIN.name())));
    ensureUser(SALES_MANAGER_ID, "Mia Thompson", "manager@fawnix.com", "Manager@123", Set.of(roles.get(RoleName.ROLE_SALES_MANAGER.name())));
    ensureUser(SARAH_KIM_ID, "Sarah Kim", "sarah.kim@fawnix.com", "Sales@123", Set.of(roles.get(RoleName.ROLE_SALES_REP.name())));
    ensureUser(MIKE_RODRIGUEZ_ID, "Mike Rodriguez", "mike.rodriguez@fawnix.com", "Sales@123", Set.of(roles.get(RoleName.ROLE_SALES_REP.name())));
    ensureUser(JAMES_LEE_ID, "James Lee", "james.lee@fawnix.com", "Sales@123", Set.of(roles.get(RoleName.ROLE_SALES_REP.name())));
    ensureUser(PRIYA_SINGH_ID, "Priya Singh", "priya.singh@fawnix.com", "Sales@123", Set.of(roles.get(RoleName.ROLE_SALES_REP.name())));
    ensureUser(ALEX_JOHNSON_ID, "Alex Johnson", "alex.johnson@fawnix.com", "Sales@123", Set.of(roles.get(RoleName.ROLE_SALES_REP.name())));
    ensureUser(EMMA_DAVIS_ID, "Emma Davis", "emma.davis@fawnix.com", "Sales@123", Set.of(roles.get(RoleName.ROLE_SALES_REP.name())));
  }

  private UserEntity ensureUser(String id, String fullName, String email, String rawPassword, Set<RoleEntity> roles) {
    return userRepository.findById(id).orElseGet(() -> {
      Instant now = Instant.now();
      UserEntity user = new UserEntity(
          id,
          fullName,
          email,
          null,
          null,
          passwordEncoder.encode(rawPassword),
          true,
          now,
          now
      );
      user.setRoles(roles);
      return userRepository.save(user);
    });
  }

  private String roleId(RoleName roleName) {
    return switch (roleName) {
      case ROLE_ADMIN -> "00000000-0000-0000-0000-000000000001";
      case ROLE_SALES_MANAGER -> "00000000-0000-0000-0000-000000000002";
      case ROLE_SALES_REP -> "00000000-0000-0000-0000-000000000003";
      case ROLE_VIEWER -> "00000000-0000-0000-0000-000000000004";
    };
  }
}
