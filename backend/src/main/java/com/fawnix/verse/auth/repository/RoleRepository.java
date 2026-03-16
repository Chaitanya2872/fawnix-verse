package com.fawnix.verse.auth.repository;

import com.fawnix.verse.auth.entity.RoleEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<RoleEntity, String> {

  Optional<RoleEntity> findByName(String name);
}
