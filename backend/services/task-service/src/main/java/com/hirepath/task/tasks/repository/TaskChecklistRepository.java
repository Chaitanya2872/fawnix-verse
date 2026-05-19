package com.hirepath.task.tasks.repository;

import com.hirepath.task.tasks.domain.TaskChecklistItemEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskChecklistRepository extends JpaRepository<TaskChecklistItemEntity, String> {
  List<TaskChecklistItemEntity> findByTask_IdOrderByCreatedAtAsc(String taskId);
  Optional<TaskChecklistItemEntity> findByIdAndTask_Id(String id, String taskId);
}
