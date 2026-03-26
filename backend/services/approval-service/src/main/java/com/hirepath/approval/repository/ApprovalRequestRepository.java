package com.hirepath.approval.repository;

import java.util.UUID;

import com.hirepath.approval.domain.ApprovalRequest;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, UUID>, JpaSpecificationExecutor<ApprovalRequest> {

    @EntityGraph(attributePaths = {"stages", "stages.assignments", "actions"})
    @Query("select r from ApprovalRequest r where r.id = :id")
    ApprovalRequest findDetailedById(@Param("id") UUID id);

    @EntityGraph(attributePaths = {"stages", "stages.assignments"})
    Page<ApprovalRequest> findByRequesterId(String requesterId, Pageable pageable);

    @EntityGraph(attributePaths = {"stages", "stages.assignments"})
    @Query("select r from ApprovalRequest r where r.module = :module and r.entityType = :entityType and r.entityId = :entityId")
    ApprovalRequest findByEntity(@Param("module") String module, @Param("entityType") String entityType, @Param("entityId") String entityId);
}
