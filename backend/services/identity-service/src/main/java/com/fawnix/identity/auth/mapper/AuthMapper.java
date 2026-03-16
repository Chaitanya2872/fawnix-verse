package com.fawnix.identity.auth.mapper;

import com.fawnix.identity.auth.dto.AuthDtos;
import com.fawnix.identity.security.service.AppUserDetails;
import org.springframework.stereotype.Component;

@Component
public class AuthMapper {

  public AuthDtos.CurrentUserResponse toCurrentUserResponse(AppUserDetails userDetails) {
    return new AuthDtos.CurrentUserResponse(
        userDetails.getUserId(),
        userDetails.getFullName(),
        userDetails.getUsername(),
        userDetails.getRoleNames()
    );
  }
}
