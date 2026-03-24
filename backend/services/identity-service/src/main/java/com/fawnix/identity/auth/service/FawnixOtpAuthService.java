package com.fawnix.identity.auth.service;

import com.fawnix.identity.auth.dto.AuthDtos;
import com.fawnix.identity.auth.dto.FawnixOtpDtos;
import com.fawnix.identity.auth.entity.RoleEntity;
import com.fawnix.identity.auth.repository.RoleRepository;
import com.fawnix.identity.common.exception.BadRequestException;
import com.fawnix.identity.common.exception.ResourceNotFoundException;
import com.fawnix.identity.users.entity.UserEntity;
import com.fawnix.identity.users.permission.UserPermissionCatalog;
import com.fawnix.identity.users.repository.UserRepository;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FawnixOtpAuthService {

  private final FawnixOtpClient otpClient;
  private final UserRepository userRepository;
  private final RoleRepository roleRepository;
  private final PasswordEncoder passwordEncoder;
  private final AuthService authService;
  private final String defaultRoleName;

  public FawnixOtpAuthService(
      FawnixOtpClient otpClient,
      UserRepository userRepository,
      RoleRepository roleRepository,
      PasswordEncoder passwordEncoder,
      AuthService authService,
      @Value("${app.fawnix-otp.default-role:ROLE_VIEWER}") String defaultRoleName
  ) {
    this.otpClient = otpClient;
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.passwordEncoder = passwordEncoder;
    this.authService = authService;
    this.defaultRoleName = defaultRoleName;
  }

  public FawnixOtpDtos.RequestOtpResponse requestOtp(String empCode) {
    return otpClient.requestOtp(empCode);
  }

  @Transactional
  public AuthDtos.TokenResponse verifyOtp(String empCode, String otp) {
    FawnixOtpDtos.VerifyOtpResponse verifyResponse = otpClient.verifyOtp(empCode, otp);
    if (Boolean.FALSE.equals(verifyResponse.success()) || verifyResponse.accessToken() == null) {
      throw new BadRequestException("OTP verification failed.");
    }

    FawnixOtpDtos.FawnixMeResponse meResponse = otpClient.fetchProfile(verifyResponse.accessToken());
    if (meResponse.data() == null || Boolean.FALSE.equals(meResponse.success())) {
      throw new BadRequestException("Unable to load employee profile.");
    }

    UserEntity user = upsertUser(meResponse.data());
    return authService.issueTokensForUser(user);
  }

  private UserEntity upsertUser(FawnixOtpDtos.FawnixUser profile) {
    String email = normalizeEmail(profile.empEmail());
    if (email.isEmpty()) {
      throw new BadRequestException("Employee email is missing.");
    }

    UserEntity user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
      Instant now = Instant.now();
      UserEntity created = new UserEntity(
          UUID.randomUUID().toString(),
          profile.empFullName() != null ? profile.empFullName().trim() : email,
          email,
          normalizePhone(profile.empContact()),
          null,
          passwordEncoder.encode(UUID.randomUUID().toString()),
          true,
          now,
          now
      );
      RoleEntity role = roleRepository.findByName(defaultRoleName)
          .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + defaultRoleName));
      created.setRoles(Set.of(role));
      created.setPermissions(UserPermissionCatalog.defaultsForRoleName(role.getName()));
      return created;
    });

    boolean updated = false;
    String fullName = profile.empFullName() != null ? profile.empFullName().trim() : user.getFullName();
    if (fullName != null && !fullName.equals(user.getFullName())) {
      user.setFullName(fullName);
      updated = true;
    }
    String phone = normalizePhone(profile.empContact());
    if (phone != null && !phone.equals(user.getPhoneNumber())) {
      user.setPhoneNumber(phone);
      updated = true;
    }
    if (!user.isActive()) {
      user.setActive(true);
      updated = true;
    }
    if (user.getRoles() == null || user.getRoles().isEmpty()) {
      RoleEntity role = roleRepository.findByName(defaultRoleName)
          .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + defaultRoleName));
      user.setRoles(Set.of(role));
      user.setPermissions(UserPermissionCatalog.defaultsForRoleName(role.getName()));
      updated = true;
    }

    if (updated) {
      user.setUpdatedAt(Instant.now());
      return userRepository.save(user);
    }
    return user;
  }

  private String normalizeEmail(String email) {
    if (email == null) {
      return "";
    }
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizePhone(String phoneNumber) {
    if (phoneNumber == null) {
      return null;
    }
    String trimmed = phoneNumber.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
