package com.fawnix.identity.auth.controller;

import com.fawnix.identity.auth.dto.AuthDtos;
import com.fawnix.identity.auth.service.AuthService;
import com.fawnix.identity.security.service.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/login")
  public AuthDtos.TokenResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
    return authService.login(request);
  }

  @PostMapping("/register")
  public AuthDtos.TokenResponse register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
    return authService.register(request);
  }

  @PostMapping("/refresh")
  public AuthDtos.TokenResponse refresh(@Valid @RequestBody AuthDtos.RefreshTokenRequest request) {
    return authService.refresh(request);
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(@Valid @RequestBody AuthDtos.LogoutRequest request) {
    authService.logout(request);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/me")
  public AuthDtos.CurrentUserResponse me(@AuthenticationPrincipal AppUserDetails userDetails) {
    return authService.currentUser(userDetails);
  }
}
