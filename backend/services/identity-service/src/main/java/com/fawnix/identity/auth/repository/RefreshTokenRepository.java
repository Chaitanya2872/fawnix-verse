package com.fawnix.identity.auth.repository;

import com.fawnix.identity.auth.entity.RefreshTokenEntity;
import com.fawnix.identity.users.entity.UserEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshTokenEntity, String> {

  Optional<RefreshTokenEntity> findByToken(String token);

  List<RefreshTokenEntity> findAllByUserAndRevokedFalse(UserEntity user);

  void deleteAllByUser(UserEntity user);
}
