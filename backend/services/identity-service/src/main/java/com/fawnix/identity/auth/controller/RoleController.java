package com.fawnix.identity.auth.controller;

import com.fawnix.identity.auth.dto.RoleDtos;
import com.fawnix.identity.auth.service.RoleService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

  private final RoleService roleService;

  public RoleController(RoleService roleService) {
    this.roleService = roleService;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('feature.admin.roles.manage')")
  public List<RoleDtos.RoleResponse> listRoles() {
    return roleService.getRoles();
  }

  @PostMapping
  @PreAuthorize("hasAuthority('feature.admin.roles.manage')")
  public RoleDtos.RoleResponse createRole(@Valid @RequestBody RoleDtos.CreateRoleRequest request) {
    return roleService.createRole(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('feature.admin.roles.manage')")
  public RoleDtos.RoleResponse updateRole(
      @PathVariable String id,
      @Valid @RequestBody RoleDtos.UpdateRoleRequest request
  ) {
    return roleService.updateRole(id, request);
  }

  @PostMapping("/{id}/clone")
  @PreAuthorize("hasAuthority('feature.admin.roles.manage')")
  public RoleDtos.RoleResponse cloneRole(
      @PathVariable String id,
      @Valid @RequestBody RoleDtos.CloneRoleRequest request
  ) {
    return roleService.cloneRole(id, request);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAuthority('feature.admin.roles.manage')")
  public RoleDtos.RoleResponse updateRoleStatus(
      @PathVariable String id,
      @Valid @RequestBody RoleDtos.UpdateRoleStatusRequest request
  ) {
    return roleService.updateRoleStatus(id, request.active());
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('feature.admin.roles.manage')")
  public ResponseEntity<Void> deleteRole(@PathVariable String id) {
    roleService.deleteRole(id);
    return ResponseEntity.noContent().build();
  }
}
