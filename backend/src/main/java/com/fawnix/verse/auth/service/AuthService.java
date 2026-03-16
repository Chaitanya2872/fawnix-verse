package com.fawnix.verse.auth.service;

import com.fawnix.verse.auth.dto.AuthDtos;
import com.fawnix.verse.auth.entity.RefreshTokenEntity;
import com.fawnix.verse.auth.mapper.AuthMapper;
import com.fawnix.verse.auth.repository.RefreshTokenRepository;
import com.fawnix.verse.common.exception.BadRequestException;
import com.fawnix.verse.common.exception.ResourceNotFoundException;
import com.fawnix.verse.security.jwt.JwtService;
import com.fawnix.verse.security.service.AppUserDetails;
import com.fawnix.verse.users.entity.UserEntity;
import com.fawnix.verse.users.repository.UserRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private final AuthenticationManager authenticationManager;
  private final UserRepository userRepository;
  private final RefreshTokenRepository refreshTokenRepository;
  private final JwtService jwtService;
  private final AuthMapper authMapper;

  public AuthService(
      AuthenticationManager authenticationManager,
      UserRepository userRepository,
      RefreshTokenRepository refreshTokenRepository,
      JwtService jwtService,
      AuthMapper authMapper
  ) {
    this.authenticationManager = authenticationManager;
    this.userRepository = userRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.jwtService = jwtService;
    this.authMapper = authMapper;
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
}
