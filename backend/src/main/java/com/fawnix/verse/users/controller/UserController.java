package com.fawnix.verse.users.controller;

import com.fawnix.verse.users.dto.AssigneeResponse;
import com.fawnix.verse.users.service.UserService;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

  private final UserService userService;

  public UserController(UserService userService) {
    this.userService = userService;
  }

  @GetMapping("/assignees")
  @PreAuthorize("isAuthenticated()")
  public List<AssigneeResponse> getAssignees() {
    return userService.getAssignees();
  }
}
