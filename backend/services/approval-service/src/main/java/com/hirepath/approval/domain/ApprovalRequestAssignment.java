package com.hirepath.approval.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "approval_request_assignments")
public class ApprovalRequestAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "request_stage_id", nullable = false)
    private ApprovalRequestStage stage;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignee_type", nullable = false)
    private AssigneeType assigneeType;

    @Column(name = "assignee_value", nullable = false)
    private String assigneeValue;

    @Enumerated(EnumType.STRING)
    private ApprovalAssignmentStatus status = ApprovalAssignmentStatus.PENDING;

    @Column(name = "acted_at")
    private OffsetDateTime actedAt;

    public UUID getId() {
        return id;
    }

    public ApprovalRequestStage getStage() {
        return stage;
    }

    public void setStage(ApprovalRequestStage stage) {
        this.stage = stage;
    }

    public AssigneeType getAssigneeType() {
        return assigneeType;
    }

    public void setAssigneeType(AssigneeType assigneeType) {
        this.assigneeType = assigneeType;
    }

    public String getAssigneeValue() {
        return assigneeValue;
    }

    public void setAssigneeValue(String assigneeValue) {
        this.assigneeValue = assigneeValue;
    }

    public ApprovalAssignmentStatus getStatus() {
        return status;
    }

    public void setStatus(ApprovalAssignmentStatus status) {
        this.status = status;
    }

    public OffsetDateTime getActedAt() {
        return actedAt;
    }

    public void setActedAt(OffsetDateTime actedAt) {
        this.actedAt = actedAt;
    }
}
