package com.hirepath.approval.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.hirepath.approval.domain.ApprovalRequestStage;
import com.hirepath.approval.domain.ApprovalStageStatus;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApprovalRequestStageRepository extends JpaRepository<ApprovalRequestStage, UUID> {

    @EntityGraph(attributePaths = {"request", "assignments"})
    @Query("""
        select s from ApprovalRequestStage s
        where s.status in :statuses
          and s.dueAt is not null
          and s.dueAt < :now
          and s.overdueNotifiedAt is null
        """)
    List<ApprovalRequestStage> findOverdueStages(
        @Param("statuses") List<ApprovalStageStatus> statuses,
        @Param("now") OffsetDateTime now
    );
}
