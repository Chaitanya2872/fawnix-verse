package com.hirepath.approval.repository;

import java.util.List;
import java.util.UUID;

import com.hirepath.approval.domain.ApprovalRequestAssignment;
import com.hirepath.approval.domain.AssigneeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApprovalRequestAssignmentRepository extends JpaRepository<ApprovalRequestAssignment, UUID> {

    @Query("select a from ApprovalRequestAssignment a where a.assigneeType = :type and a.assigneeValue = :value")
    List<ApprovalRequestAssignment> findByAssignee(@Param("type") AssigneeType type, @Param("value") String value);
}
