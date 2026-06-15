package com.fawnix.identity.auth.repository;

import com.fawnix.identity.auth.entity.PermissionEntity;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PermissionRepository extends JpaRepository<PermissionEntity, String> {

  boolean existsByKeyIgnoreCase(String key);

  List<PermissionEntity> findAllByActiveTrueOrderByModuleKeyAscLabelAsc();

  List<PermissionEntity> findAllByOrderByModuleKeyAscLabelAsc();

  List<PermissionEntity> findAllByKeyIn(Collection<String> keys);

  @Modifying
  @Query(value = "update permissions set key = :newKey, label = :label, module_key = :moduleKey, description = :description, active = :active, updated_at = :updatedAt where key = :oldKey", nativeQuery = true)
  int renamePermission(
      @Param("oldKey") String oldKey,
      @Param("newKey") String newKey,
      @Param("label") String label,
      @Param("moduleKey") String moduleKey,
      @Param("description") String description,
      @Param("active") boolean active,
      @Param("updatedAt") Instant updatedAt
  );

  @Modifying
  @Query(value = "update user_permissions set permission = :newKey where permission = :oldKey", nativeQuery = true)
  int renameUserPermissionAssignments(@Param("oldKey") String oldKey, @Param("newKey") String newKey);

  @Modifying
  @Query(value = "update access_request_permissions set permission = :newKey where permission = :oldKey", nativeQuery = true)
  int renameAccessRequestPermissionAssignments(@Param("oldKey") String oldKey, @Param("newKey") String newKey);

  @Modifying
  @Query(value = "delete from user_permissions where permission = :key", nativeQuery = true)
  int deleteUserPermissionAssignments(@Param("key") String key);

  @Modifying
  @Query(value = "delete from access_request_permissions where permission = :key", nativeQuery = true)
  int deleteAccessRequestPermissionAssignments(@Param("key") String key);
}
