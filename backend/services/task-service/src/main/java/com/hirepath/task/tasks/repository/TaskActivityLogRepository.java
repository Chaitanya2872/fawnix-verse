package com.hirepath.task.tasks.repository;

import com.hirepath.task.tasks.domain.TaskActivityLogEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskActivityLogRepository extends JpaRepository<TaskActivityLogEntity, String> {
  List<TaskActivityLogEntity> findByTask_IdOrderByCreatedAtAsc(String taskId);
  List<TaskActivityLogEntity> findTop20ByOrderByCreatedAtDesc();
}
