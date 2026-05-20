package com.hirepath.task.tasks.repository;

import com.hirepath.task.tasks.domain.TaskSpaceMemberEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskSpaceMemberRepository extends JpaRepository<TaskSpaceMemberEntity, String> {
  List<TaskSpaceMemberEntity> findBySpace_IdAndActiveTrueOrderByRoleAscUserNameAsc(String spaceId);
  List<TaskSpaceMemberEntity> findByUserIdAndActiveTrueOrderByUpdatedAtDesc(String userId);
  Optional<TaskSpaceMemberEntity> findBySpace_IdAndUserIdAndActiveTrue(String spaceId, String userId);
  boolean existsBySpace_IdAndUserIdAndActiveTrue(String spaceId, String userId);
}
