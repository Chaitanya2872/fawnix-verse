package com.hirepath.task.tasks.repository;

import com.hirepath.task.tasks.domain.TaskEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TaskRepository extends JpaRepository<TaskEntity, String>, JpaSpecificationExecutor<TaskEntity> {
  Optional<TaskEntity> findTopByOrderByCreatedAtDesc();
}
