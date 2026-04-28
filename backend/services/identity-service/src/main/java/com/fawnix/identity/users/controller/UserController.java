package com.fawnix.identity.users.controller;

import com.fawnix.identity.users.dto.AssigneeResponse;
import com.fawnix.identity.users.dto.UserDtos;
import com.fawnix.identity.users.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

  @GetMapping
  @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_MASTER')")
  public List<UserDtos.UserResponse> getUsers() {
    return userService.getUsers();
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_MASTER')")
  public UserDtos.UserResponse getUserById(@PathVariable String id) {
    return userService.getUserById(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_MASTER')")
  public UserDtos.UserResponse createUser(@Valid @RequestBody UserDtos.CreateUserRequest request) {
    return userService.createUser(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_MASTER')")
  public UserDtos.UserResponse updateUser(
      @PathVariable String id,
      @Valid @RequestBody UserDtos.UpdateUserRequest request
  ) {
    return userService.updateUser(id, request);
  }

  @PatchMapping("/{id}/role")
  @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_MASTER')")
  public UserDtos.UserResponse updateUserRole(
      @PathVariable String id,
      @Valid @RequestBody UserDtos.UpdateUserRoleRequest request
  ) {
    return userService.updateUserRole(id, request.role());
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_MASTER')")
  public UserDtos.UserResponse updateUserStatus(
      @PathVariable String id,
      @Valid @RequestBody UserDtos.UpdateUserStatusRequest request
  ) {
    return userService.updateUserStatus(id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_MASTER')")
  public ResponseEntity<Void> deleteUser(@PathVariable String id) {
    userService.deleteUser(id);
    return ResponseEntity.noContent().build();
  }
}
