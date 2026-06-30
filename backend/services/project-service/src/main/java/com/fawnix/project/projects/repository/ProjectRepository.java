package com.fawnix.project.projects.repository;

import com.fawnix.project.projects.domain.ProjectEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<ProjectEntity, String> {

  List<ProjectEntity> findAllByOrderByUpdatedAtDescCreatedAtDesc();
}
