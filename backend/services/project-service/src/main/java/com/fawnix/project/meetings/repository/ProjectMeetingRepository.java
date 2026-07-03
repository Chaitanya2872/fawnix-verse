package com.fawnix.project.meetings.repository;

import com.fawnix.project.meetings.domain.ProjectMeetingEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectMeetingRepository extends JpaRepository<ProjectMeetingEntity, String> {

  List<ProjectMeetingEntity> findAllByOrderByStartAtAscCreatedAtDesc();

  List<ProjectMeetingEntity> findAllByProjectIdOrderByStartAtAscCreatedAtDesc(String projectId);
}
