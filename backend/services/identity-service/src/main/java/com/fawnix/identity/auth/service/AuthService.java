package com.fawnix.identity.auth.service;

import com.fawnix.identity.auth.dto.AuthDtos;
import com.fawnix.identity.auth.entity.RefreshTokenEntity;
import com.fawnix.identity.auth.entity.RoleEntity;
import com.fawnix.identity.auth.entity.RoleName;
import com.fawnix.identity.auth.mapper.AuthMapper;
import com.fawnix.identity.auth.repository.RefreshTokenRepository;
import com.fawnix.identity.auth.repository.RoleRepository;
import com.fawnix.identity.common.exception.BadRequestException;
import com.fawnix.identity.common.exception.ResourceNotFoundException;
import com.fawnix.identity.security.jwt.JwtService;
import com.fawnix.identity.security.service.AppUserDetails;
import com.fawnix.identity.users.entity.UserEntity;
import com.fawnix.identity.users.permission.UserPermissionCatalog;
import com.fawnix.identity.users.repository.UserRepository;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private final AuthenticationManager authenticationManager;
  private final UserRepository userRepository;
  private final RefreshTokenRepository refreshTokenRepository;
  private final JwtService jwtService;
  private final AuthMapper authMapper;
  private final RoleRepository roleRepository;
  private final PasswordEncoder passwordEncoder;

  public AuthService(
      AuthenticationManager authenticationManager,
      UserRepository userRepository,
      RefreshTokenRepository refreshTokenRepository,
      JwtService jwtService,
      AuthMapper authMapper,
      RoleRepository roleRepository,
      PasswordEncoder passwordEncoder
  ) {
    this.authenticationManager = authenticationManager;
    this.userRepository = userRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.jwtService = jwtService;
    this.authMapper = authMapper;
    this.roleRepository = roleRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Transactional
  public AuthDtos.TokenResponse login(AuthDtos.LoginRequest request) {
    Authentication authentication = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(request.email(), request.password())
    );
    AppUserDetails userDetails = (AppUserDetails) authentication.getPrincipal();
    UserEntity user = userRepository.findById(userDetails.getUserId())
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    revokeActiveTokens(user);
    return issueTokens(userDetails, user);
  }

  @Transactional
  public AuthDtos.TokenResponse register(AuthDtos.RegisterRequest request) {
    return registerWithRole(request, RoleName.ROLE_VIEWER);
  }

  @Transactional
  public AuthDtos.TokenResponse registerWithRole(AuthDtos.RegisterRequest request, RoleName roleName) {
    String email = normalizeEmail(request.email());
    ensureEmailAvailable(email);
    RoleEntity role = roleRepository.findByName(roleName.name())
        .orElseThrow(() -> new IllegalStateException(roleName + " role is not configured."));

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
    user.setPermissions(UserPermissionCatalog.defaultsForRole(roleName));
    UserEntity saved = userRepository.save(user);
    AppUserDetails userDetails = new AppUserDetails(saved);
    return issueTokens(userDetails, saved);
  }

  @Transactional
  public AuthDtos.TokenResponse refresh(AuthDtos.RefreshTokenRequest request) {
    RefreshTokenEntity refreshToken = refreshTokenRepository.findByToken(request.refreshToken())
        .orElseThrow(() -> new BadRequestException("Refresh token is invalid."));

    if (refreshToken.isRevoked() || refreshToken.getExpiresAt().isBefore(Instant.now())) {
      throw new BadRequestException("Refresh token has expired.");
    }

    refreshToken.setRevoked(true);
    refreshTokenRepository.save(refreshToken);

    AppUserDetails userDetails = new AppUserDetails(refreshToken.getUser());
    return issueTokens(userDetails, refreshToken.getUser());
  }

  @Transactional
  public void logout(AuthDtos.LogoutRequest request) {
    refreshTokenRepository.findByToken(request.refreshToken()).ifPresent(token -> {
      token.setRevoked(true);
      refreshTokenRepository.save(token);
    });
  }

  public AuthDtos.CurrentUserResponse currentUser(AppUserDetails userDetails) {
    return authMapper.toCurrentUserResponse(userDetails);
  }

  private void revokeActiveTokens(UserEntity user) {
    refreshTokenRepository.findAllByUserAndRevokedFalse(user).forEach(token -> token.setRevoked(true));
  }

  private AuthDtos.TokenResponse issueTokens(AppUserDetails userDetails, UserEntity user) {
    Instant refreshExpiry = jwtService.getRefreshTokenExpiry();
    RefreshTokenEntity refreshToken = new RefreshTokenEntity(
        UUID.randomUUID().toString(),
        user,
        UUID.randomUUID().toString(),
        refreshExpiry,
        false,
        Instant.now()
    );
    refreshTokenRepository.save(refreshToken);

    return new AuthDtos.TokenResponse(
        jwtService.generateAccessToken(userDetails),
        refreshToken.getToken(),
        jwtService.getAccessTokenExpiry(),
        refreshExpiry,
        authMapper.toCurrentUserResponse(userDetails)
    );
  }

  private void ensureEmailAvailable(String email) {
    userRepository.findByEmailIgnoreCase(email).ifPresent(existing -> {
      throw new BadRequestException("Email is already in use.");
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
}
