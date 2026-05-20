package com.hirepath.task.tasks.repository;

import com.hirepath.task.tasks.domain.TaskSpaceInvitationEntity;
import com.hirepath.task.tasks.domain.TaskSpaceInvitationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskSpaceInvitationRepository extends JpaRepository<TaskSpaceInvitationEntity, String> {
  List<TaskSpaceInvitationEntity> findByInviteeUserIdAndStatusOrderByCreatedAtDesc(String inviteeUserId, TaskSpaceInvitationStatus status);
  List<TaskSpaceInvitationEntity> findBySpace_IdOrderByCreatedAtDesc(String spaceId);
  Optional<TaskSpaceInvitationEntity> findByIdAndInviteeUserId(String id, String inviteeUserId);
  Optional<TaskSpaceInvitationEntity> findBySpace_IdAndInviteeUserIdAndStatus(String spaceId, String inviteeUserId, TaskSpaceInvitationStatus status);
}
