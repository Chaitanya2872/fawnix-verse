package com.fawnix.identity.auth.service;

import com.fawnix.identity.auth.dto.AuthDtos;
import com.fawnix.identity.auth.entity.RefreshTokenEntity;
import com.fawnix.identity.auth.entity.RoleEntity;
import com.fawnix.identity.auth.mapper.AuthMapper;
import com.fawnix.identity.auth.repository.RefreshTokenRepository;
import com.fawnix.identity.common.exception.BadRequestException;
import com.fawnix.identity.common.exception.ResourceNotFoundException;
import com.fawnix.identity.security.jwt.JwtService;
import com.fawnix.identity.security.service.AppUserDetails;
import com.fawnix.identity.users.entity.UserEntity;
import com.fawnix.identity.users.repository.UserRepository;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
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
  private final PasswordEncoder passwordEncoder;
  private final RoleService roleService;
  private final String defaultRoleName;
  private final String bootstrapAdminRoleName;
  private final String bootstrapMasterRoleName;

  public AuthService(
      AuthenticationManager authenticationManager,
      UserRepository userRepository,
      RefreshTokenRepository refreshTokenRepository,
      JwtService jwtService,
      AuthMapper authMapper,
      PasswordEncoder passwordEncoder,
      RoleService roleService,
      @Value("${app.security.default-role-name:ROLE_VIEWER}") String defaultRoleName,
      @Value("${app.security.bootstrap-admin-role-name:ROLE_ADMIN}") String bootstrapAdminRoleName,
      @Value("${app.security.bootstrap-master-role-name:ROLE_MASTER}") String bootstrapMasterRoleName
  ) {
    this.authenticationManager = authenticationManager;
    this.userRepository = userRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.jwtService = jwtService;
    this.authMapper = authMapper;
    this.passwordEncoder = passwordEncoder;
    this.roleService = roleService;
    this.defaultRoleName = defaultRoleName;
    this.bootstrapAdminRoleName = bootstrapAdminRoleName;
    this.bootstrapMasterRoleName = bootstrapMasterRoleName;
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
    return registerWithRole(request, defaultRoleName);
  }

  @Transactional
  public AuthDtos.TokenResponse registerAdmin(AuthDtos.RegisterRequest request) {
    return registerWithRole(request, bootstrapAdminRoleName);
  }

  @Transactional
  public AuthDtos.TokenResponse registerMaster(AuthDtos.RegisterRequest request) {
    return registerWithRole(request, bootstrapMasterRoleName);
  }

  @Transactional
  public AuthDtos.TokenResponse registerWithRole(AuthDtos.RegisterRequest request, String roleName) {
    String email = normalizeEmail(request.email());
    ensureEmailAvailable(email);
    RoleEntity role = roleService.resolveActiveRole(roleName);

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
    user.setPermissions(new LinkedHashSet<>());
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

  @Transactional
  public AuthDtos.TokenResponse issueTokensForUser(UserEntity user) {
    revokeActiveTokens(user);
    AppUserDetails userDetails = new AppUserDetails(user);
    return issueTokens(userDetails, user);
  }

  public AuthDtos.AccessTokenResponse issueAccessTokenForUser(UserEntity user) {
    AppUserDetails userDetails = new AppUserDetails(user);
    return new AuthDtos.AccessTokenResponse(
        jwtService.generateAccessToken(userDetails),
        jwtService.getAccessTokenExpiry(),
        authMapper.toCurrentUserResponse(userDetails)
    );
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
