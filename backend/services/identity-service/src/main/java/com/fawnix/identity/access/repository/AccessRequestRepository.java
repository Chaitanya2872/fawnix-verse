package com.fawnix.identity.access.repository;

import com.fawnix.identity.access.entity.AccessRequestEntity;
import com.fawnix.identity.access.entity.AccessRequestStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessRequestRepository extends JpaRepository<AccessRequestEntity, String> {

  @EntityGraph(attributePaths = {"requester", "requester.roles", "reviewedBy"})
  List<AccessRequestEntity> findAllByRequester_IdOrderByCreatedAtDesc(String requesterId);

  @EntityGraph(attributePaths = {"requester", "requester.roles", "reviewedBy"})
  List<AccessRequestEntity> findAllByOrderByCreatedAtDesc();

  @EntityGraph(attributePaths = {"requester", "requester.roles", "reviewedBy"})
  List<AccessRequestEntity> findAllByStatusOrderByCreatedAtAsc(AccessRequestStatus status);

  @EntityGraph(attributePaths = {"requester", "requester.roles", "reviewedBy"})
  Optional<AccessRequestEntity> findById(String id);
}
