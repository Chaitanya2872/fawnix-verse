package com.fawnix.identity.auth.repository;

import com.fawnix.identity.auth.entity.RoleEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<RoleEntity, String> {

  Optional<RoleEntity> findByName(String name);
}
