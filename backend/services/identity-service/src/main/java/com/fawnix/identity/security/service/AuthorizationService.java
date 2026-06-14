package com.fawnix.identity.security.service;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("authz")
public class AuthorizationService {

  public boolean hasAuthority(Authentication authentication, String authority) {
    if (authentication == null || !authentication.isAuthenticated()) {
      return false;
    }

    return authentication.getAuthorities().stream()
        .map(grantedAuthority -> grantedAuthority.getAuthority())
        .anyMatch(grantedAuthority ->
            "ROLE_MASTER".equals(grantedAuthority) || authority.equals(grantedAuthority)
        );
  }
}
