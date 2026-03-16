package com.fawnix.verse.users.mapper;

import com.fawnix.verse.users.dto.AssigneeResponse;
import com.fawnix.verse.users.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

  public AssigneeResponse toAssignee(UserEntity user) {
    return new AssigneeResponse(user.getId(), user.getFullName(), user.getEmail());
  }
}
