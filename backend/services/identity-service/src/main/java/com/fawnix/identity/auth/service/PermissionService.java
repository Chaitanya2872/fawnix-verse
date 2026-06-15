package com.fawnix.identity.auth.service;

import com.fawnix.identity.auth.dto.PermissionDtos;
import com.fawnix.identity.auth.entity.PermissionEntity;
import com.fawnix.identity.auth.repository.PermissionRepository;
import com.fawnix.identity.common.exception.BadRequestException;
import com.fawnix.identity.common.exception.ResourceNotFoundException;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class PermissionService {

  private final PermissionRepository permissionRepository;

  public PermissionService(PermissionRepository permissionRepository) {
    this.permissionRepository = permissionRepository;
  }

  @Transactional(readOnly = true)
  public List<PermissionDtos.PermissionResponse> getPermissions() {
    return permissionRepository.findAllByOrderByModuleKeyAscLabelAsc().stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<PermissionEntity> getActivePermissions() {
    return permissionRepository.findAllByActiveTrueOrderByModuleKeyAscLabelAsc();
  }

  @Transactional(readOnly = true)
  public Set<String> getActivePermissionKeys() {
    return getActivePermissions().stream().map(PermissionEntity::getKey)
        .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
  }

  @Transactional
  public PermissionDtos.PermissionResponse createPermission(PermissionDtos.CreatePermissionRequest request) {
    String key = normalizeKey(request.key());
    if (permissionRepository.existsByKeyIgnoreCase(key)) {
      throw new BadRequestException("Permission key already exists.");
    }
    Instant now = Instant.now();
    PermissionEntity permission = new PermissionEntity(
        key,
        normalizeLabel(request.label()),
        normalizeModuleKey(request.moduleKey()),
        normalizeDescription(request.description()),
        true,
        false,
        now,
        now
    );
    return toResponse(permissionRepository.save(permission));
  }

  @Transactional
  public PermissionDtos.PermissionResponse updatePermission(String key, PermissionDtos.UpdatePermissionRequest request) {
    String existingKey = normalizeKey(key);
    PermissionEntity permission = permissionRepository.findById(existingKey)
        .orElseThrow(() -> new ResourceNotFoundException("Permission not found"));

    String nextKey = normalizeKey(request.key());
    if (!existingKey.equals(nextKey) && permissionRepository.existsByKeyIgnoreCase(nextKey)) {
      throw new BadRequestException("Permission key already exists.");
    }

    String label = normalizeLabel(request.label());
    String moduleKey = normalizeModuleKey(request.moduleKey());
    String description = normalizeDescription(request.description());
    Instant now = Instant.now();

    if (!existingKey.equals(nextKey)) {
      permissionRepository.renameUserPermissionAssignments(existingKey, nextKey);
      permissionRepository.renameAccessRequestPermissionAssignments(existingKey, nextKey);
      permissionRepository.renamePermission(existingKey, nextKey, label, moduleKey, description, request.active(), now);
      return toResponse(permissionRepository.findById(nextKey)
          .orElseThrow(() -> new ResourceNotFoundException("Permission not found")));
    }

    permission.setLabel(label);
    permission.setModuleKey(moduleKey);
    permission.setDescription(description);
    permission.setActive(request.active());
    permission.setUpdatedAt(now);
    return toResponse(permissionRepository.save(permission));
  }

  @Transactional
  public void deletePermission(String key) {
    PermissionEntity permission = permissionRepository.findById(normalizeKey(key))
        .orElseThrow(() -> new ResourceNotFoundException("Permission not found"));
    if (permission.isSystemDefined()) {
      throw new BadRequestException("System permissions cannot be deleted.");
    }
    permissionRepository.deleteUserPermissionAssignments(permission.getKey());
    permissionRepository.deleteAccessRequestPermissionAssignments(permission.getKey());
    permissionRepository.delete(permission);
  }

  @Transactional(readOnly = true)
  public Set<PermissionEntity> resolvePermissions(List<String> keys) {
    if (keys == null || keys.isEmpty()) {
      return new LinkedHashSet<>();
    }
    LinkedHashSet<String> normalized = new LinkedHashSet<>();
    for (String key : keys) {
      if (!StringUtils.hasText(key)) {
        continue;
      }
      normalized.add(normalizeKey(key));
    }
    if (normalized.isEmpty()) {
      return new LinkedHashSet<>();
    }
    List<PermissionEntity> matches = permissionRepository.findAllByKeyIn(normalized);
    if (matches.size() != normalized.size()) {
      LinkedHashSet<String> found = matches.stream()
          .map(PermissionEntity::getKey)
          .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
      normalized.removeAll(found);
      throw new BadRequestException("Unknown permissions: " + String.join(", ", normalized));
    }
    LinkedHashSet<PermissionEntity> active = matches.stream()
        .filter(PermissionEntity::isActive)
        .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    if (active.size() != matches.size()) {
      throw new BadRequestException("Inactive permissions cannot be assigned.");
    }
    return active;
  }

  private PermissionDtos.PermissionResponse toResponse(PermissionEntity permission) {
    return new PermissionDtos.PermissionResponse(
        permission.getKey(),
        permission.getLabel(),
        permission.getModuleKey(),
        permission.getDescription(),
        permission.isActive(),
        permission.isSystemDefined(),
        permission.getCreatedAt(),
        permission.getUpdatedAt()
    );
  }

  private String normalizeKey(String key) {
    if (!StringUtils.hasText(key)) {
      throw new BadRequestException("Permission key is required.");
    }
    return key.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeLabel(String label) {
    if (!StringUtils.hasText(label)) {
      throw new BadRequestException("Permission label is required.");
    }
    return label.trim();
  }

  private String normalizeModuleKey(String moduleKey) {
    if (!StringUtils.hasText(moduleKey)) {
      throw new BadRequestException("Module key is required.");
    }
    return moduleKey.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeDescription(String description) {
    if (!StringUtils.hasText(description)) {
      return null;
    }
    return description.trim();
  }
}
