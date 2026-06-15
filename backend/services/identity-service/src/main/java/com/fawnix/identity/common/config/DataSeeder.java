package com.fawnix.identity.common.config;

import com.fawnix.identity.auth.entity.RoleEntity;
import com.fawnix.identity.auth.service.RoleService;
import com.fawnix.identity.users.entity.UserEntity;
import com.fawnix.identity.users.repository.UserRepository;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataSeeder implements ApplicationRunner {

  public static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final RoleService roleService;

  @Value("${app.security.dev-admin-email}")
  private String devAdminEmail;

  @Value("${app.security.dev-admin-password}")
  private String devAdminPassword;

  @Value("${app.security.bootstrap-master-role-name:ROLE_MASTER}")
  private String bootstrapMasterRoleName;

  public DataSeeder(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      RoleService roleService
  ) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.roleService = roleService;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    ensureAdminUser();
  }

  private void ensureAdminUser() {
    if (userRepository.findById(ADMIN_ID).isPresent()) {
      return;
    }
    Instant now = Instant.now();
    RoleEntity role = roleService.resolveActiveRole(bootstrapMasterRoleName);
    UserEntity user = new UserEntity(
        ADMIN_ID,
        "Admin User",
        devAdminEmail,
        null,
        null,
        passwordEncoder.encode(devAdminPassword),
        true,
        now,
        now
    );
    user.setRoles(Set.of(role));
    user.setPermissions(new LinkedHashSet<>());
    userRepository.save(user);
  }
}
