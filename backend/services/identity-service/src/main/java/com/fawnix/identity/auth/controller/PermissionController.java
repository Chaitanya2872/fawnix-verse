package com.fawnix.identity.auth.controller;

import com.fawnix.identity.auth.dto.PermissionDtos;
import com.fawnix.identity.auth.service.PermissionService;
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
@RequestMapping("/api/permissions")
public class PermissionController {

  private final PermissionService permissionService;

  public PermissionController(PermissionService permissionService) {
    this.permissionService = permissionService;
  }

  @GetMapping
  @PreAuthorize("@authz.hasAuthority(authentication, 'feature.admin.permissions.manage')")
  public List<PermissionDtos.PermissionResponse> listPermissions() {
    return permissionService.getPermissions();
  }

  @PostMapping
  @PreAuthorize("@authz.hasAuthority(authentication, 'feature.admin.permissions.manage')")
  public PermissionDtos.PermissionResponse createPermission(@Valid @RequestBody PermissionDtos.CreatePermissionRequest request) {
    return permissionService.createPermission(request);
  }

  @PatchMapping("/{key}")
  @PreAuthorize("@authz.hasAuthority(authentication, 'feature.admin.permissions.manage')")
  public PermissionDtos.PermissionResponse updatePermission(
      @PathVariable String key,
      @Valid @RequestBody PermissionDtos.UpdatePermissionRequest request
  ) {
    return permissionService.updatePermission(key, request);
  }

  @DeleteMapping("/{key}")
  @PreAuthorize("@authz.hasAuthority(authentication, 'feature.admin.permissions.manage')")
  public ResponseEntity<Void> deletePermission(@PathVariable String key) {
    permissionService.deletePermission(key);
    return ResponseEntity.noContent().build();
  }
}
