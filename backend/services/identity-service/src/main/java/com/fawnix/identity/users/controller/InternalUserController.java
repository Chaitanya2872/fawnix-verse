package com.fawnix.identity.users.controller;

import com.fawnix.identity.common.exception.ForbiddenOperationException;
import com.fawnix.identity.users.dto.AssigneeResponse;
import com.fawnix.identity.users.dto.InternalUserResponse;
import com.fawnix.identity.users.dto.UserSummaryResponse;
import com.fawnix.identity.users.service.UserService;
import java.util.List;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/users")
public class InternalUserController {

  private final UserService userService;
  private final String internalServiceSecret;

  public InternalUserController(
      UserService userService,
      @Value("${app.security.internal-service-secret}") String internalServiceSecret
  ) {
    this.userService = userService;
    this.internalServiceSecret = internalServiceSecret;
  }

  @GetMapping("/{id}")
  public InternalUserResponse getUserById(
      @PathVariable String id,
      @RequestHeader("X-Internal-Service-Secret") String providedSecret
  ) {
    verifySecret(providedSecret);
    return userService.getAssignableUserById(id);
  }

  @GetMapping("/lookup")
  public InternalUserResponse getUserByName(
      @RequestParam String name,
      @RequestHeader("X-Internal-Service-Secret") String providedSecret
  ) {
    verifySecret(providedSecret);
    return userService.getAssignableUserByName(name);
  }

  @GetMapping("/assignees")
  public List<AssigneeResponse> getAssignees(
      @RequestHeader("X-Internal-Service-Secret") String providedSecret
  ) {
    verifySecret(providedSecret);
    return userService.getAssignees();
  }

  @GetMapping("/summary")
  public UserSummaryResponse getSummary(
      @RequestHeader("X-Internal-Service-Secret") String providedSecret
  ) {
    verifySecret(providedSecret);
    return userService.getUserSummary();
  }

  private void verifySecret(String providedSecret) {
    if (!Objects.equals(internalServiceSecret, providedSecret)) {
      throw new ForbiddenOperationException("Internal access denied.");
    }
  }
}
