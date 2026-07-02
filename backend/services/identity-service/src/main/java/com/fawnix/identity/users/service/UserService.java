package com.fawnix.identity.users.service;

import com.fawnix.identity.auth.entity.PermissionEntity;
import com.fawnix.identity.auth.entity.RoleEntity;
import com.fawnix.identity.auth.repository.RoleRepository;
import com.fawnix.identity.auth.service.PermissionService;
import com.fawnix.identity.auth.service.RoleService;
import com.fawnix.identity.common.exception.BadRequestException;
import com.fawnix.identity.common.exception.ResourceNotFoundException;
import com.fawnix.identity.users.dto.AssigneeResponse;
import com.fawnix.identity.users.dto.InternalUserResponse;
import com.fawnix.identity.users.dto.UserSummaryResponse;
import com.fawnix.identity.users.dto.UserDtos;
import com.fawnix.identity.users.entity.UserEntity;
import com.fawnix.identity.users.mapper.UserMapper;
import com.fawnix.identity.users.repository.UserRepository;
import com.fawnix.identity.auth.entity.RefreshTokenEntity;
import com.fawnix.identity.auth.repository.RefreshTokenRepository;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class UserService {

  private static final Set<String> ASSIGNEE_ROLE_NAMES = Set.of("ROLE_SALES_REP");

  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final RoleRepository roleRepository;
  private final PasswordEncoder passwordEncoder;
  private final RefreshTokenRepository refreshTokenRepository;
  private final RoleService roleService;
  private final PermissionService permissionService;

  public UserService(
      UserRepository userRepository,
      UserMapper userMapper,
      RoleRepository roleRepository,
      PasswordEncoder passwordEncoder,
      RefreshTokenRepository refreshTokenRepository,
      RoleService roleService,
      PermissionService permissionService
  ) {
    this.userRepository = userRepository;
    this.userMapper = userMapper;
    this.roleRepository = roleRepository;
    this.passwordEncoder = passwordEncoder;
    this.refreshTokenRepository = refreshTokenRepository;
    this.roleService = roleService;
    this.permissionService = permissionService;
  }

  @Transactional(readOnly = true)
  public List<AssigneeResponse> getAssignees() {
    return userRepository.findAllByActiveTrueOrderByFullNameAsc().stream()
        .filter(this::isAssignable)
        .map(userMapper::toAssignee)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<AssigneeResponse> getActiveUsersDirectory() {
    return userRepository.findAllByActiveTrueOrderByFullNameAsc().stream()
        .map(userMapper::toAssignee)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<UserDtos.UserResponse> getUsers() {
    return userRepository.findAllByOrderByFullNameAsc().stream()
        .map(userMapper::toUserResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public UserDtos.UserResponse getUserById(String userId) {
    return userMapper.toUserResponse(requireUser(userId));
  }

  @Transactional
  public UserDtos.UserResponse createUser(UserDtos.CreateUserRequest request) {
    String email = normalizeEmail(request.email());
    ensureEmailAvailable(email, null);
    RoleEntity role = roleService.resolveActiveRole(request.role());
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
    user.setPermissions(normalizeDirectPermissions(request.permissions(), role));
    return userMapper.toUserResponse(userRepository.save(user));
  }

  @Transactional
  public UserDtos.UserResponse updateUser(String userId, UserDtos.UpdateUserRequest request) {
    UserEntity user = requireUser(userId);
    String email = normalizeEmail(request.email());
    ensureEmailAvailable(email, userId);
    RoleEntity role = roleService.resolveActiveRole(request.role());

    user.setFullName(request.fullName().trim());
    user.setEmail(email);
    user.setPhoneNumber(normalizePhone(request.phoneNumber()));
    user.setLanguage(normalizeLanguage(request.language()));
    user.setRoles(Set.of(role));
    user.setPermissions(normalizeDirectPermissions(request.permissions(), role));
    if (request.password() != null && !request.password().isBlank()) {
      user.setPasswordHash(passwordEncoder.encode(request.password()));
    }
    user.setUpdatedAt(Instant.now());
    return userMapper.toUserResponse(userRepository.save(user));
  }

  @Transactional
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

  @Transactional
  public UserDtos.UserResponse updateUserRole(String userId, String roleInput) {
    UserEntity user = requireUser(userId);
    RoleEntity role = roleService.resolveActiveRole(roleInput);
    user.setRoles(Set.of(role));
    user.setPermissions(new LinkedHashSet<>());
    user.setUpdatedAt(Instant.now());
    return userMapper.toUserResponse(userRepository.save(user));
  }

  @Transactional
  public UserDtos.UserResponse updateUserAccess(String userId, UserDtos.UpdateUserAccessRequest request) {
    UserEntity user = requireUser(userId);
    RoleEntity role = roleService.resolveActiveRole(request.role());
    user.setRoles(Set.of(role));
    user.setPermissions(normalizeDirectPermissions(request.permissions(), role));
    user.setUpdatedAt(Instant.now());
    return userMapper.toUserResponse(userRepository.save(user));
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
    UserEntity user = requireUser(userId);
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
    Map<String, Integer> byRole = new LinkedHashMap<>();
    for (UserEntity user : users) {
      user.getRoles().forEach(role -> byRole.merge(role.getName(), 1, Integer::sum));
    }
    return new UserSummaryResponse(users.size(), byRole);
  }

  @Transactional(readOnly = true)
  public List<UserDtos.RoleOptionResponse> getAvailableRoles() {
    return roleRepository.findAllByActiveTrueOrderByDisplayNameAsc().stream()
        .map(role -> new UserDtos.RoleOptionResponse(
            role.getName(),
            role.getDisplayName(),
            role.getPermissions().stream().map(PermissionEntity::getKey).sorted().toList()
        ))
        .toList();
  }

  @Transactional(readOnly = true)
  public UserDtos.AccessControlCatalogResponse getAccessControlCatalog() {
    List<UserDtos.RoleOptionResponse> roles = roleRepository.findAllByOrderByDisplayNameAsc().stream()
        .map(role -> new UserDtos.RoleOptionResponse(
            role.getName(),
            role.getDisplayName(),
            role.getPermissions().stream().map(PermissionEntity::getKey).sorted().toList()
        ))
        .toList();

    List<PermissionEntity> permissions = permissionService.getActivePermissions();
    List<UserDtos.PermissionModuleResponse> modules = permissions.stream()
        .collect(java.util.stream.Collectors.groupingBy(
            PermissionEntity::getModuleKey,
            LinkedHashMap::new,
            java.util.stream.Collectors.toList()
        ))
        .entrySet()
        .stream()
        .map(entry -> new UserDtos.PermissionModuleResponse(
            entry.getKey(),
            toModuleLabel(entry.getKey()),
            entry.getValue().stream()
                .map(permission -> new UserDtos.PermissionDefinitionResponse(
                    permission.getKey(),
                    permission.getLabel(),
                    permission.getDescription(),
                    permission.getModuleKey(),
                    derivePermissionLevel(permission.getKey())
                ))
                .toList()
        ))
        .toList();

    return new UserDtos.AccessControlCatalogResponse(
        roles,
        modules,
        permissions.stream().map(PermissionEntity::getKey).toList()
    );
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

  private Set<String> normalizeDirectPermissions(List<String> requested, RoleEntity role) {
    if (requested == null) {
      return new LinkedHashSet<>();
    }
    Set<String> rolePermissionKeys = role.getPermissions().stream()
        .map(PermissionEntity::getKey)
        .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    Set<String> desired = permissionService.resolvePermissions(requested).stream()
        .map(PermissionEntity::getKey)
        .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    desired.removeAll(rolePermissionKeys);
    return desired;
  }

  private boolean isAssignable(UserEntity user) {
    if (!user.isActive()) {
      return false;
    }
    return user.getRoles().stream()
        .map(RoleEntity::getName)
        .anyMatch(ASSIGNEE_ROLE_NAMES::contains);
  }

  private void validateAssignable(UserEntity user) {
    if (!isAssignable(user)) {
      throw new IllegalArgumentException("Assignee not found");
    }
  }

  private String derivePermissionLevel(String key) {
    if (key.startsWith("module.")) {
      return "MODULE";
    }
    if (key.startsWith("page.")) {
      return "PAGE";
    }
    return "FEATURE";
  }

  private String toModuleLabel(String moduleKey) {
    if (!StringUtils.hasText(moduleKey)) {
      return "General";
    }
    String[] parts = moduleKey.trim().split("[._-]");
    StringBuilder builder = new StringBuilder();
    for (String part : parts) {
      if (part.isBlank()) {
        continue;
      }
      if (builder.length() > 0) {
        builder.append(' ');
      }
      if ("crm".equalsIgnoreCase(part) || "hrms".equalsIgnoreCase(part)) {
        builder.append(part.toUpperCase(Locale.ROOT));
      } else {
        builder.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1).toLowerCase(Locale.ROOT));
      }
    }
    return builder.length() == 0 ? moduleKey : builder.toString();
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
