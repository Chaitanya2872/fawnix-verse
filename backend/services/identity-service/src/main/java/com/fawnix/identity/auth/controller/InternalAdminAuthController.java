package com.fawnix.identity.auth.controller;

import com.fawnix.identity.auth.dto.AuthDtos;
import com.fawnix.identity.auth.entity.RoleName;
import com.fawnix.identity.auth.service.AuthService;
import com.fawnix.identity.common.exception.ForbiddenOperationException;
import jakarta.validation.Valid;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/auth")
public class InternalAdminAuthController {

  private final AuthService authService;
  private final String internalServiceSecret;

  public InternalAdminAuthController(
      AuthService authService,
      @Value("${app.security.internal-service-secret}") String internalServiceSecret
  ) {
    this.authService = authService;
    this.internalServiceSecret = internalServiceSecret;
  }

  @PostMapping("/register-admin")
  public AuthDtos.TokenResponse registerAdmin(
      @Valid @RequestBody AuthDtos.RegisterRequest request,
      @RequestHeader("X-Internal-Service-Secret") String providedSecret
  ) {
    verifySecret(providedSecret);
    return authService.registerWithRole(request, RoleName.ROLE_ADMIN);
  }

  @PostMapping("/register-master")
  public AuthDtos.TokenResponse registerMaster(
      @Valid @RequestBody AuthDtos.RegisterRequest request,
      @RequestHeader("X-Internal-Service-Secret") String providedSecret
  ) {
    verifySecret(providedSecret);
    return authService.registerWithRole(request, RoleName.ROLE_MASTER);
  }

  private void verifySecret(String providedSecret) {
    if (!Objects.equals(internalServiceSecret, providedSecret)) {
      throw new ForbiddenOperationException("Internal access denied.");
    }
  }
}
