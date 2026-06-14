package com.fawnix.identity.users.mapper;

import com.fawnix.identity.users.dto.AssigneeResponse;
import com.fawnix.identity.users.dto.InternalUserResponse;
import com.fawnix.identity.users.dto.UserDtos;
import com.fawnix.identity.auth.entity.PermissionEntity;
import com.fawnix.identity.users.entity.UserEntity;
import java.util.LinkedHashSet;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

  public AssigneeResponse toAssignee(UserEntity user) {
    return new AssigneeResponse(
        user.getId(),
        user.getFullName(),
        user.getEmail(),
        user.getPhoneNumber()
    );
  }

  public InternalUserResponse toInternalUser(UserEntity user) {
    return new InternalUserResponse(
        user.getId(),
        user.getFullName(),
        user.getEmail(),
        user.getPhoneNumber(),
        user.isActive(),
        user.getRoles().stream().map(role -> role.getName()).toList()
    );
  }

  public UserDtos.UserResponse toUserResponse(UserEntity user) {
    LinkedHashSet<String> permissions = new LinkedHashSet<>(user.getPermissions());
    user.getRoles().forEach(role -> role.getPermissions().stream()
        .filter(PermissionEntity::isActive)
        .map(PermissionEntity::getKey)
        .forEach(permissions::add));
    return new UserDtos.UserResponse(
        user.getId(),
        user.getFullName(),
        user.getEmail(),
        user.getPhoneNumber(),
        user.getLanguage(),
        user.isActive(),
        user.getRoles().stream().map(role -> role.getName()).toList(),
        permissions.stream().toList(),
        user.getCreatedAt(),
        user.getUpdatedAt()
    );
  }
}
