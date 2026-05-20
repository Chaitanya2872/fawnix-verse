package com.hirepath.task.tasks.repository;

import com.hirepath.task.tasks.domain.TaskSpaceEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskSpaceRepository extends JpaRepository<TaskSpaceEntity, String> {
  List<TaskSpaceEntity> findByArchivedFalseOrderByUpdatedAtDesc();
  Optional<TaskSpaceEntity> findByIdAndArchivedFalse(String id);
  boolean existsBySpaceKeyIgnoreCase(String spaceKey);
}
