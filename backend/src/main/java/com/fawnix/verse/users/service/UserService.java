package com.fawnix.verse.users.service;

import com.fawnix.verse.auth.entity.RoleName;
import com.fawnix.verse.users.dto.AssigneeResponse;
import com.fawnix.verse.users.entity.UserEntity;
import com.fawnix.verse.users.mapper.UserMapper;
import com.fawnix.verse.users.repository.UserRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class UserService {

  private final UserRepository userRepository;
  private final UserMapper userMapper;

  public UserService(UserRepository userRepository, UserMapper userMapper) {
    this.userRepository = userRepository;
    this.userMapper = userMapper;
  }

  public List<AssigneeResponse> getAssignees() {
    return userRepository.findDistinctByActiveTrueAndRoles_NameInOrderByFullNameAsc(
            List.of(RoleName.ROLE_SALES_REP.name(), RoleName.ROLE_SALES_MANAGER.name()))
        .stream()
        .map(userMapper::toAssignee)
        .toList();
  }

  public UserEntity requireById(String userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));
  }
}
