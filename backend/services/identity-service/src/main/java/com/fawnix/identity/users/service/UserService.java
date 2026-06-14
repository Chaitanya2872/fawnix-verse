package com.fawnix.identity.users.service;

import com.fawnix.identity.auth.entity.RefreshTokenEntity;
import com.fawnix.identity.auth.entity.RoleEntity;
import com.fawnix.identity.auth.entity.RoleName;
import com.fawnix.identity.auth.repository.RefreshTokenRepository;
import com.fawnix.identity.auth.repository.RoleRepository;
import com.fawnix.identity.common.exception.BadRequestException;
import com.fawnix.identity.common.exception.ResourceNotFoundException;
import com.fawnix.identity.users.dto.AssigneeResponse;
import com.fawnix.identity.users.dto.InternalUserResponse;
import com.fawnix.identity.users.dto.UserSummaryResponse;
import com.fawnix.identity.users.dto.UserDtos;
import com.fawnix.identity.users.entity.UserEntity;
import com.fawnix.identity.users.mapper.UserMapper;
import com.fawnix.identity.users.permission.UserPermissionCatalog;
import com.fawnix.identity.users.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class UserService {

  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final RoleRepository roleRepository;
  private final PasswordEncoder passwordEncoder;
  private final RefreshTokenRepository refreshTokenRepository;

  public UserService(
      UserRepository userRepository,
      UserMapper userMapper,
      RoleRepository roleRepository,
      PasswordEncoder passwordEncoder,
      RefreshTokenRepository refreshTokenRepository
  ) {
    this.userRepository = userRepository;
    this.userMapper = userMapper;
    this.roleRepository = roleRepository;
    this.passwordEncoder = passwordEncoder;
    this.refreshTokenRepository = refreshTokenRepository;
  }

  @Transactional(readOnly = true)
  public List<AssigneeResponse> getAssignees() {
    return userRepository.findDistinctByActiveTrueAndRoles_NameInOrderByFullNameAsc(
            List.of(RoleName.ROLE_SALES_REP.name(), RoleName.ROLE_SALES_MANAGER.name()))
        .stream()
        .map(userMapper::toAssignee)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<UserDtos.UserResponse> getUsers() {
    return userRepository.findAllByOrderByFullNameAsc()
        .stream()
        .map(userMapper::toUserResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public UserDtos.UserResponse getUserById(String userId) {
    return userMapper.toUserResponse(requireUser(userId));
  }

  public UserDtos.UserResponse createUser(UserDtos.CreateUserRequest request) {
    String email = normalizeEmail(request.email());
    ensureEmailAvailable(email, null);
    RoleEntity role = resolveRole(request.role());
    RoleName roleName = RoleName.valueOf(role.getName());
    Instant now = Instant.now();
    UserEntity user = new UserEntity(
        UUID.randomUUID().toString(),
        request.fullName().trim(),
        email,
        normalizePhone(request.phoneNumber()),
        normalizeLanguage(request.language()),
        passwordEncoder.encode(request.password()),
        true,
        now,
        now
    );
    user.setRoles(Set.of(role));
    user.setPermissions(normalizePermissions(request.permissions(), roleName));
    return userMapper.toUserResponse(userRepository.save(user));
  }

  public UserDtos.UserResponse updateUser(String userId, UserDtos.UpdateUserRequest request) {
    UserEntity user = requireUser(userId);
    String email = normalizeEmail(request.email());
    ensureEmailAvailable(email, userId);
    RoleEntity role = resolveRole(request.role());
    RoleName roleName = RoleName.valueOf(role.getName());

    user.setFullName(request.fullName().trim());
    user.setEmail(email);
    user.setPhoneNumber(normalizePhone(request.phoneNumber()));
    user.setLanguage(normalizeLanguage(request.language()));
    user.setRoles(Set.of(role));
    user.setPermissions(normalizePermissions(request.permissions(), roleName));
    if (request.password() != null && !request.password().isBlank()) {
      user.setPasswordHash(passwordEncoder.encode(request.password()));
    }
    user.setUpdatedAt(Instant.now());
    return userMapper.toUserResponse(userRepository.save(user));
  }

  public UserDtos.UserResponse updateUserStatus(String userId, UserDtos.UpdateUserStatusRequest request) {
    UserEntity user = requireUser(userId);
    if (user.isActive() != request.active()) {
      user.setActive(request.active());
      user.setUpdatedAt(Instant.now());
      if (!request.active()) {
        revokeRefreshTokens(user);
      }
    }
    return userMapper.toUserResponse(userRepository.save(user));
  }

  public UserDtos.UserResponse updateUserRole(String userId, String roleInput) {
    UserEntity user = requireUser(userId);
    RoleEntity role = resolveRole(roleInput);
    RoleName roleName = RoleName.valueOf(role.getName());
    user.setRoles(Set.of(role));
    user.setPermissions(normalizePermissions(null, roleName));
    user.setUpdatedAt(Instant.now());
    return userMapper.toUserResponse(userRepository.save(user));
  }

  public UserDtos.UserResponse updateUserAccess(String userId, UserDtos.UpdateUserAccessRequest request) {
    UserEntity user = requireUser(userId);
    RoleEntity role = resolveRole(request.role());
    RoleName roleName = RoleName.valueOf(role.getName());
    user.setRoles(Set.of(role));
    user.setPermissions(normalizePermissions(request.permissions(), roleName));
    user.setUpdatedAt(Instant.now());
    return userMapper.toUserResponse(userRepository.save(user));
  }

  @Transactional(readOnly = true)
  public List<UserDtos.RoleOptionResponse> getAvailableRoles() {
    return roleRepository.findAll(Sort.by(Sort.Direction.ASC, "name"))
        .stream()
        .map(role -> {
          RoleName roleName = RoleName.valueOf(role.getName());
          return new UserDtos.RoleOptionResponse(
              role.getName(),
              toRoleLabel(roleName),
              List.copyOf(UserPermissionCatalog.defaultsForRole(roleName))
          );
        })
        .toList();
  }

  @Transactional(readOnly = true)
  public UserDtos.AccessControlCatalogResponse getAccessControlCatalog() {
    List<UserDtos.PermissionModuleResponse> modules = UserPermissionCatalog.definitions().stream()
        .collect(java.util.stream.Collectors.groupingBy(
            definition -> definition.moduleKey(),
            java.util.LinkedHashMap::new,
            java.util.stream.Collectors.toList()
        ))
        .entrySet()
        .stream()
        .map(entry -> new UserDtos.PermissionModuleResponse(
            entry.getKey(),
            toModuleLabel(entry.getKey()),
            entry.getValue().stream()
                .map(definition -> new UserDtos.PermissionDefinitionResponse(
                    definition.key(),
                    definition.label(),
                    definition.description(),
                    definition.moduleKey(),
                    definition.level()
                ))
                .toList()
        ))
        .toList();

    return new UserDtos.AccessControlCatalogResponse(
        getAvailableRoles(),
        modules,
        List.copyOf(UserPermissionCatalog.ALL_PERMISSIONS)
    );
  }

  @Transactional
  public void deleteUser(String userId) {
    UserEntity user = requireUser(userId);
    refreshTokenRepository.deleteAllByUser(user);
    user.getRoles().clear();
    userRepository.delete(user);
  }

  @Transactional(readOnly = true)
  public InternalUserResponse getAssignableUserById(String userId) {
    UserEntity user = userRepository.findById(userId)
        .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));
    validateAssignable(user);
    return userMapper.toInternalUser(user);
  }

  @Transactional(readOnly = true)
  public InternalUserResponse getAssignableUserByName(String name) {
    UserEntity user = userRepository.findByFullNameIgnoreCase(name)
        .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));
    validateAssignable(user);
    return userMapper.toInternalUser(user);
  }

  @Transactional(readOnly = true)
  public InternalUserResponse getAssignableUserByEmail(String email) {
    UserEntity user = userRepository.findByEmailIgnoreCase(normalizeEmail(email))
        .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));
    validateAssignable(user);
    return userMapper.toInternalUser(user);
  }

  @Transactional(readOnly = true)
  public UserSummaryResponse getUserSummary() {
    List<UserEntity> users = userRepository.findAllByOrderByFullNameAsc();
    Map<String, Integer> byRole = new HashMap<>();
    for (UserEntity user : users) {
      user.getRoles().forEach(role -> {
        String key = normalizeRoleName(role.getName());
        byRole.merge(key, 1, Integer::sum);
      });
    }
    return new UserSummaryResponse(users.size(), byRole);
  }

  private void validateAssignable(UserEntity user) {
    boolean assignable = user.isActive() && user.getRoles().stream().anyMatch(role ->
        RoleName.ROLE_SALES_MANAGER.name().equals(role.getName())
            || RoleName.ROLE_SALES_REP.name().equals(role.getName()));
    if (!assignable) {
      throw new IllegalArgumentException("Assignee not found");
    }
  }

  private UserEntity requireUser(String userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
  }

  private void ensureEmailAvailable(String email, String currentUserId) {
    userRepository.findByEmailIgnoreCase(email).ifPresent(existing -> {
      if (currentUserId == null || !existing.getId().equals(currentUserId)) {
        throw new BadRequestException("Email is already in use.");
      }
    });
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

  private String normalizeLanguage(String language) {
    if (language == null) {
      return null;
    }
    String trimmed = language.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private String normalizeRoleName(String roleName) {
    if (roleName == null) {
      return "unknown";
    }
    return roleName.replace("ROLE_", "").toLowerCase(Locale.ROOT);
  }

  private String toRoleLabel(RoleName roleName) {
    String normalized = roleName.name().replace("ROLE_", "").toLowerCase(Locale.ROOT);
    String[] parts = normalized.split("_");
    StringBuilder builder = new StringBuilder();
    for (String part : parts) {
      if (part.isBlank()) {
        continue;
      }
      if (builder.length() > 0) {
        builder.append(' ');
      }
      builder.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1));
    }
    return builder.toString();
  }

  private String toModuleLabel(String moduleKey) {
    String normalized = moduleKey == null ? "" : moduleKey.toLowerCase(Locale.ROOT);
    return switch (normalized) {
      case "access" -> "Access";
      case "admin" -> "Admin";
      case "analytics" -> "Analytics";
      case "approvals" -> "Approvals";
      case "crm" -> "CRM";
      case "forms" -> "Forms";
      case "hrms" -> "HRMS";
      case "integrations" -> "Integrations";
      case "inventory" -> "Inventory";
      case "notifications" -> "Notifications";
      case "org" -> "Organization";
      case "purchases" -> "Purchases";
      case "recruitment" -> "Recruitment";
      case "reports" -> "Reports";
      case "sales" -> "Sales";
      case "tasks" -> "Tasks";
      default -> moduleKey;
    };
  }

  private RoleEntity resolveRole(String roleInput) {
    if (roleInput == null || roleInput.isBlank()) {
      throw new BadRequestException("Role is required.");
    }
    String normalized = roleInput.trim().toUpperCase(Locale.ROOT);
    RoleName roleName = switch (normalized) {
      case "MASTER", "ROLE_MASTER" -> RoleName.ROLE_MASTER;
      case "ADMIN", "ROLE_ADMIN" -> RoleName.ROLE_ADMIN;
      case "REPORTING_MANAGER", "ROLE_REPORTING_MANAGER" -> RoleName.ROLE_REPORTING_MANAGER;
      case "MANAGER", "ROLE_MANAGER", "ROLE_SALES_MANAGER" -> RoleName.ROLE_SALES_MANAGER;
      case "SALES_REP", "ROLE_SALES_REP" -> RoleName.ROLE_SALES_REP;
      case "EMPLOYEE", "ROLE_EMPLOYEE" -> RoleName.ROLE_EMPLOYEE;
      case "HR_MANAGER", "ROLE_HR_MANAGER" -> RoleName.ROLE_HR_MANAGER;
      case "RECRUITER", "ROLE_RECRUITER" -> RoleName.ROLE_RECRUITER;
      case "HIRING_MANAGER", "ROLE_HIRING_MANAGER" -> RoleName.ROLE_HIRING_MANAGER;
      case "INTERVIEWER", "ROLE_INTERVIEWER" -> RoleName.ROLE_INTERVIEWER;
      case "VIEWER", "ROLE_VIEWER" -> RoleName.ROLE_VIEWER;
      default -> throw new BadRequestException("Role is invalid.");
    };
    return roleRepository.findByName(roleName.name())
        .orElseThrow(() -> new BadRequestException("Role is invalid."));
  }

  private Set<String> normalizePermissions(List<String> requested, RoleName roleName) {
    if (roleName == RoleName.ROLE_MASTER) {
      return new LinkedHashSet<>(UserPermissionCatalog.ALL_PERMISSIONS);
    }

    if (requested == null) {
      return UserPermissionCatalog.defaultsForRole(roleName);
    }

    Set<String> normalized = new LinkedHashSet<>();
    List<String> unknown = new ArrayList<>();
    for (String permission : requested) {
      if (!StringUtils.hasText(permission)) {
        continue;
      }
      String trimmed = permission.trim();
      if (!UserPermissionCatalog.ALL_PERMISSIONS.contains(trimmed)) {
        unknown.add(trimmed);
        continue;
      }
      normalized.add(trimmed);
    }

    if (!unknown.isEmpty()) {
      throw new BadRequestException("Unknown permissions: " + String.join(", ", unknown));
    }

    return normalized;
  }

  private void revokeRefreshTokens(UserEntity user) {
    List<RefreshTokenEntity> tokens = refreshTokenRepository.findAllByUserAndRevokedFalse(user);
    if (tokens.isEmpty()) {
      return;
    }
    tokens.forEach(token -> token.setRevoked(true));
    refreshTokenRepository.saveAll(tokens);
  }
}
