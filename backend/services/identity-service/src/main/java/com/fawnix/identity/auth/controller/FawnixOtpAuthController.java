package com.fawnix.identity.auth.controller;

import com.fawnix.identity.auth.dto.AuthDtos;
import com.fawnix.identity.auth.dto.FawnixOtpDtos;
import com.fawnix.identity.auth.service.FawnixOtpAuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class FawnixOtpAuthController {

  private final FawnixOtpAuthService otpAuthService;

  public FawnixOtpAuthController(FawnixOtpAuthService otpAuthService) {
    this.otpAuthService = otpAuthService;
  }

  @PostMapping("/request-otp")
  public FawnixOtpDtos.RequestOtpResponse requestOtp(
      @Valid @RequestBody FawnixOtpDtos.RequestOtpRequest request
  ) {
    return otpAuthService.requestOtp(request.empCode());
  }

  @PostMapping("/verify-otp")
  public AuthDtos.TokenResponse verifyOtp(
      @Valid @RequestBody FawnixOtpDtos.VerifyOtpRequest request
  ) {
    return otpAuthService.verifyOtp(request.empCode(), request.otp());
  }
}
