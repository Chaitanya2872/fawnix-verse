package com.hirepath.task.tasks.repository;

import com.hirepath.task.tasks.domain.TaskAssignmentEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskAssignmentRepository extends JpaRepository<TaskAssignmentEntity, String> {
  List<TaskAssignmentEntity> findByTask_IdOrderByAssignedAtDesc(String taskId);
  List<TaskAssignmentEntity> findByTask_IdAndActiveTrueOrderByAssignedAtDesc(String taskId);
  List<TaskAssignmentEntity> findByTask_IdInAndActiveTrueOrderByAssignedAtDesc(List<String> taskIds);
  Optional<TaskAssignmentEntity> findFirstByTask_IdAndActiveTrueOrderByAssignedAtDesc(String taskId);
}
