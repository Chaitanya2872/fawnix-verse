package com.fawnix.verse.auth.mapper;

import com.fawnix.verse.auth.dto.AuthDtos;
import com.fawnix.verse.security.service.AppUserDetails;
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
