package com.fawnix.identity.auth.repository;

import com.fawnix.identity.auth.entity.RoleEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<RoleEntity, String> {

  @EntityGraph(attributePaths = {"permissions"})
  Optional<RoleEntity> findByName(String name);

  @EntityGraph(attributePaths = {"permissions"})
  List<RoleEntity> findAllByOrderByDisplayNameAsc();

  @EntityGraph(attributePaths = {"permissions"})
  List<RoleEntity> findAllByActiveTrueOrderByDisplayNameAsc();

  Optional<RoleEntity> findByDisplayNameIgnoreCase(String displayName);
}
