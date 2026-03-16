package com.fawnix.verse.users.repository;

import com.fawnix.verse.users.entity.UserEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, String> {

  @EntityGraph(attributePaths = "roles")
  Optional<UserEntity> findByEmailIgnoreCase(String email);

  Optional<UserEntity> findByFullNameIgnoreCase(String fullName);

  @EntityGraph(attributePaths = "roles")
  List<UserEntity> findAllByActiveTrueOrderByFullNameAsc();

  @EntityGraph(attributePaths = "roles")
  List<UserEntity> findDistinctByActiveTrueAndRoles_NameInOrderByFullNameAsc(List<String> roleNames);
}
