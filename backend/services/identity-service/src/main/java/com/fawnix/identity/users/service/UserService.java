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
import com.fawnix.identity.users.dto.UserDtos;
import com.fawnix.identity.users.entity.UserEntity;
import com.fawnix.identity.users.mapper.UserMapper;
import com.fawnix.identity.users.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

  public List<AssigneeResponse> getAssignees() {
    return userRepository.findDistinctByActiveTrueAndRoles_NameInOrderByFullNameAsc(
            List.of(RoleName.ROLE_SALES_REP.name(), RoleName.ROLE_SALES_MANAGER.name()))
        .stream()
        .map(userMapper::toAssignee)
        .toList();
  }

  public List<UserDtos.UserResponse> getUsers() {
    return userRepository.findAllByOrderByFullNameAsc()
        .stream()
        .map(userMapper::toUserResponse)
        .toList();
  }

  public UserDtos.UserResponse getUserById(String userId) {
    return userMapper.toUserResponse(requireUser(userId));
  }

  public UserDtos.UserResponse createUser(UserDtos.CreateUserRequest request) {
    String email = normalizeEmail(request.email());
    ensureEmailAvailable(email, null);
    RoleEntity role = resolveRole(request.role());
    Instant now = Instant.now();
    UserEntity user = new UserEntity(
        UUID.randomUUID().toString(),
        request.fullName().trim(),
        email,
        normalizePhone(request.phoneNumber()),
        passwordEncoder.encode(request.password()),
        true,
        now,
        now
    );
    user.setRoles(Set.of(role));
    return userMapper.toUserResponse(userRepository.save(user));
  }

  public UserDtos.UserResponse updateUser(String userId, UserDtos.UpdateUserRequest request) {
    UserEntity user = requireUser(userId);
    String email = normalizeEmail(request.email());
    ensureEmailAvailable(email, userId);
    RoleEntity role = resolveRole(request.role());

    user.setFullName(request.fullName().trim());
    user.setEmail(email);
    user.setPhoneNumber(normalizePhone(request.phoneNumber()));
    user.setRoles(Set.of(role));
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

  @Transactional
  public void deleteUser(String userId) {
    UserEntity user = requireUser(userId);
    refreshTokenRepository.deleteAllByUser(user);
    user.getRoles().clear();
    userRepository.delete(user);
  }

  public InternalUserResponse getAssignableUserById(String userId) {
    UserEntity user = userRepository.findById(userId)
        .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));
    validateAssignable(user);
    return userMapper.toInternalUser(user);
  }

  public InternalUserResponse getAssignableUserByName(String name) {
    UserEntity user = userRepository.findByFullNameIgnoreCase(name)
        .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));
    validateAssignable(user);
    return userMapper.toInternalUser(user);
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

  private RoleEntity resolveRole(String roleInput) {
    if (roleInput == null || roleInput.isBlank()) {
      throw new BadRequestException("Role is required.");
    }
    String normalized = roleInput.trim().toUpperCase(Locale.ROOT);
    RoleName roleName = switch (normalized) {
      case "ADMIN", "ROLE_ADMIN" -> RoleName.ROLE_ADMIN;
      case "MANAGER", "ROLE_MANAGER", "ROLE_SALES_MANAGER" -> RoleName.ROLE_SALES_MANAGER;
      case "EMPLOYEE", "ROLE_EMPLOYEE", "ROLE_SALES_REP" -> RoleName.ROLE_SALES_REP;
      case "VIEWER", "ROLE_VIEWER" -> RoleName.ROLE_VIEWER;
      default -> throw new BadRequestException("Role is invalid.");
    };
    return roleRepository.findByName(roleName.name())
        .orElseThrow(() -> new BadRequestException("Role is invalid."));
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
