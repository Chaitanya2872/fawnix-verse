package com.hirepath.task.tasks.repository;

import com.hirepath.task.tasks.domain.TaskCommentEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskCommentRepository extends JpaRepository<TaskCommentEntity, String> {
  List<TaskCommentEntity> findByTask_IdOrderByCreatedAtAsc(String taskId);
}
