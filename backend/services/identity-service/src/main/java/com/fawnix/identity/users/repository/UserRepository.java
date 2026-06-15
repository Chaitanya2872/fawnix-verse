package com.fawnix.identity.users.repository;

import com.fawnix.identity.users.entity.UserEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, String> {

  @Override
  @EntityGraph(attributePaths = {"roles", "roles.permissions", "permissions"})
  Optional<UserEntity> findById(String id);

  @EntityGraph(attributePaths = {"roles", "roles.permissions", "permissions"})
  Optional<UserEntity> findByEmailIgnoreCase(String email);

  Optional<UserEntity> findByFullNameIgnoreCase(String fullName);

  @EntityGraph(attributePaths = {"roles", "roles.permissions", "permissions"})
  List<UserEntity> findAllByActiveTrueOrderByFullNameAsc();

  @EntityGraph(attributePaths = {"roles", "roles.permissions", "permissions"})
  List<UserEntity> findAllByOrderByFullNameAsc();

  @EntityGraph(attributePaths = {"roles", "roles.permissions", "permissions"})
  List<UserEntity> findDistinctByActiveTrueAndRoles_NameInOrderByFullNameAsc(List<String> roleNames);

  long countByRoles_Id(String roleId);
}
