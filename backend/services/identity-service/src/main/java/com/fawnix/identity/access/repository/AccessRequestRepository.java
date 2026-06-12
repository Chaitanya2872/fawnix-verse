package com.fawnix.identity.access.repository;

import com.fawnix.identity.access.entity.AccessRequestEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AccessRequestRepository extends JpaRepository<AccessRequestEntity, String>,
    JpaSpecificationExecutor<AccessRequestEntity> {

  @EntityGraph(attributePaths = {"requester", "requester.roles", "reviewedBy"})
  Optional<AccessRequestEntity> findById(String id);
}
