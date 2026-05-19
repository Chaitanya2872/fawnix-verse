package com.hirepath.task.tasks.repository;

import com.hirepath.task.tasks.domain.TaskTimeLogEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskTimeLogRepository extends JpaRepository<TaskTimeLogEntity, String> {
  List<TaskTimeLogEntity> findByTask_IdOrderByStartedAtDesc(String taskId);
  Optional<TaskTimeLogEntity> findFirstByTask_IdAndUserIdAndEndedAtIsNullOrderByStartedAtDesc(String taskId, String userId);
}
