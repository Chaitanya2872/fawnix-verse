package com.fawnix.identity.users.mapper;

import com.fawnix.identity.users.dto.AssigneeResponse;
import com.fawnix.identity.users.dto.InternalUserResponse;
import com.fawnix.identity.users.dto.UserDtos;
import com.fawnix.identity.users.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

  public AssigneeResponse toAssignee(UserEntity user) {
    return new AssigneeResponse(user.getId(), user.getFullName(), user.getEmail());
  }

  public InternalUserResponse toInternalUser(UserEntity user) {
    return new InternalUserResponse(
        user.getId(),
        user.getFullName(),
        user.getEmail(),
        user.isActive(),
        user.getRoles().stream().map(role -> role.getName()).toList()
    );
  }

  public UserDtos.UserResponse toUserResponse(UserEntity user) {
    return new UserDtos.UserResponse(
        user.getId(),
        user.getFullName(),
        user.getEmail(),
        user.getPhoneNumber(),
        user.getLanguage(),
        user.isActive(),
        user.getRoles().stream().map(role -> role.getName()).toList(),
        user.getPermissions().stream().toList(),
        user.getCreatedAt(),
        user.getUpdatedAt()
    );
  }
}
