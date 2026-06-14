package com.fawnix.identity.auth.service;

import com.fawnix.identity.auth.dto.RoleDtos;
import com.fawnix.identity.auth.entity.PermissionEntity;
import com.fawnix.identity.auth.entity.RoleEntity;
import com.fawnix.identity.auth.repository.RoleRepository;
import com.fawnix.identity.common.exception.BadRequestException;
import com.fawnix.identity.common.exception.ResourceNotFoundException;
import com.fawnix.identity.users.repository.UserRepository;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class RoleService {

  private final RoleRepository roleRepository;
  private final PermissionService permissionService;
  private final UserRepository userRepository;

  public RoleService(RoleRepository roleRepository, PermissionService permissionService, UserRepository userRepository) {
    this.roleRepository = roleRepository;
    this.permissionService = permissionService;
    this.userRepository = userRepository;
  }

  @Transactional(readOnly = true)
  public List<RoleDtos.RoleResponse> getRoles() {
    return roleRepository.findAllByOrderByDisplayNameAsc().stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<RoleEntity> getActiveRoles() {
    return roleRepository.findAllByActiveTrueOrderByDisplayNameAsc();
  }

  @Transactional
  public RoleDtos.RoleResponse createRole(RoleDtos.CreateRoleRequest request) {
    String displayName = normalizeDisplayName(request.name());
    String key = generateUniqueKey(displayName);
    Instant now = Instant.now();
    RoleEntity role = new RoleEntity(
        UUID.randomUUID().toString(),
        key,
        displayName,
        normalizeDescription(request.description()),
        true,
        false,
        now,
        now
    );
    role.setPermissions(permissionService.resolvePermissions(request.permissions()));
    return toResponse(roleRepository.save(role));
  }

  @Transactional
  public RoleDtos.RoleResponse updateRole(String roleId, RoleDtos.UpdateRoleRequest request) {
    RoleEntity role = requireRole(roleId);
    role.setDisplayName(normalizeDisplayName(request.name()));
    role.setDescription(normalizeDescription(request.description()));
    role.setPermissions(permissionService.resolvePermissions(request.permissions()));
    role.setUpdatedAt(Instant.now());
    return toResponse(roleRepository.save(role));
  }

  @Transactional
  public RoleDtos.RoleResponse cloneRole(String roleId, RoleDtos.CloneRoleRequest request) {
    RoleEntity source = requireRole(roleId);
    String displayName = normalizeDisplayName(request.name());
    String key = generateUniqueKey(displayName);
    Instant now = Instant.now();
    RoleEntity clone = new RoleEntity(
        UUID.randomUUID().toString(),
        key,
        displayName,
        source.getDescription(),
        true,
        false,
        now,
        now
    );
    clone.setPermissions(source.getPermissions());
    return toResponse(roleRepository.save(clone));
  }

  @Transactional
  public RoleDtos.RoleResponse updateRoleStatus(String roleId, boolean active) {
    RoleEntity role = requireRole(roleId);
    if (role.isSystemDefined() && !active) {
      throw new BadRequestException("System roles cannot be deactivated.");
    }
    role.setActive(active);
    role.setUpdatedAt(Instant.now());
    return toResponse(roleRepository.save(role));
  }

  @Transactional
  public void deleteRole(String roleId) {
    RoleEntity role = requireRole(roleId);
    if (role.isSystemDefined()) {
      throw new BadRequestException("System roles cannot be deleted.");
    }
    if (userRepository.countByRoles_Id(roleId) > 0) {
      throw new BadRequestException("Role is assigned to users and cannot be deleted.");
    }
    roleRepository.delete(role);
  }

  @Transactional(readOnly = true)
  public RoleEntity resolveActiveRole(String roleInput) {
    RoleEntity role = resolveRole(roleInput);
    if (!role.isActive()) {
      throw new BadRequestException("Selected role is inactive.");
    }
    return role;
  }

  @Transactional(readOnly = true)
  public RoleEntity resolveRole(String roleInput) {
    if (!StringUtils.hasText(roleInput)) {
      throw new BadRequestException("Role is required.");
    }
    String candidate = roleInput.trim();
    return roleRepository.findById(candidate)
        .or(() -> roleRepository.findByName(candidate))
        .or(() -> roleRepository.findByDisplayNameIgnoreCase(candidate))
        .orElseThrow(() -> new BadRequestException("Role is invalid."));
  }

  private RoleEntity requireRole(String roleId) {
    return roleRepository.findById(roleId)
        .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
  }

  private RoleDtos.RoleResponse toResponse(RoleEntity role) {
    return new RoleDtos.RoleResponse(
        role.getId(),
        role.getName(),
        role.getDisplayName(),
        role.getDescription(),
        role.isActive(),
        role.isSystemDefined(),
        role.getPermissions().stream().map(PermissionEntity::getKey).sorted().toList(),
        role.getCreatedAt(),
        role.getUpdatedAt()
    );
  }

  private String normalizeDisplayName(String name) {
    if (!StringUtils.hasText(name)) {
      throw new BadRequestException("Role name is required.");
    }
    return name.trim();
  }

  private String normalizeDescription(String description) {
    if (!StringUtils.hasText(description)) {
      return null;
    }
    return description.trim();
  }

  private String generateUniqueKey(String displayName) {
    String base = displayName.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
    String candidate = base.isBlank() ? "role" : base;
    String unique = candidate;
    int suffix = 2;
    while (roleRepository.findByName(unique).isPresent()) {
      unique = candidate + "_" + suffix++;
    }
    return unique;
  }
}
