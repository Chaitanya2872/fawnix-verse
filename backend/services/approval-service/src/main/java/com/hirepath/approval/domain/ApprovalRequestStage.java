package com.hirepath.approval.domain;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "approval_request_stages")
public class ApprovalRequestStage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "request_id", nullable = false)
    private ApprovalRequest request;

    @Column(name = "stage_order", nullable = false)
    private int stageOrder;

    @Enumerated(EnumType.STRING)
    private ApprovalStageStatus status = ApprovalStageStatus.PENDING;

    @Column(name = "due_at")
    private OffsetDateTime dueAt;

    @Column(name = "sla_days")
    private Integer slaDays;

    @Column(name = "requires_all")
    private boolean requiresAll = true;

    @Column(name = "role")
    private String role;

    @Column(name = "approver_user_id")
    private String approverUserId;

    @Column(name = "action_label")
    private String actionLabel;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "overdue_notified_at")
    private OffsetDateTime overdueNotifiedAt;

    @OneToMany(mappedBy = "stage", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ApprovalRequestAssignment> assignments = new ArrayList<>();

    public UUID getId() {
        return id;
    }

    public ApprovalRequest getRequest() {
        return request;
    }

    public void setRequest(ApprovalRequest request) {
        this.request = request;
    }

    public int getStageOrder() {
        return stageOrder;
    }

    public void setStageOrder(int stageOrder) {
        this.stageOrder = stageOrder;
    }

    public ApprovalStageStatus getStatus() {
        return status;
    }

    public void setStatus(ApprovalStageStatus status) {
        this.status = status;
    }

    public OffsetDateTime getDueAt() {
        return dueAt;
    }

    public void setDueAt(OffsetDateTime dueAt) {
        this.dueAt = dueAt;
    }

    public Integer getSlaDays() {
        return slaDays;
    }

    public void setSlaDays(Integer slaDays) {
        this.slaDays = slaDays;
    }

    public boolean isRequiresAll() {
        return requiresAll;
    }

    public void setRequiresAll(boolean requiresAll) {
        this.requiresAll = requiresAll;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getApproverUserId() {
        return approverUserId;
    }

    public void setApproverUserId(String approverUserId) {
        this.approverUserId = approverUserId;
    }

    public String getActionLabel() {
        return actionLabel;
    }

    public void setActionLabel(String actionLabel) {
        this.actionLabel = actionLabel;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(OffsetDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public OffsetDateTime getOverdueNotifiedAt() {
        return overdueNotifiedAt;
    }

    public void setOverdueNotifiedAt(OffsetDateTime overdueNotifiedAt) {
        this.overdueNotifiedAt = overdueNotifiedAt;
    }

    public List<ApprovalRequestAssignment> getAssignments() {
        return assignments;
    }

    public void setAssignments(List<ApprovalRequestAssignment> assignments) {
        this.assignments = assignments;
    }
}
