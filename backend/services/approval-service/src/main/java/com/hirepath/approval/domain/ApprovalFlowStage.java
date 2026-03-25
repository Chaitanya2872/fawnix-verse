package com.hirepath.approval.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "approval_flow_stages")
public class ApprovalFlowStage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "flow_id", nullable = false)
    private ApprovalFlow flow;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(name = "role")
    private String role;

    @Column(name = "approver_user_id")
    private UUID approverUserId;

    @Column(name = "action_label")
    private String actionLabel;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public ApprovalFlow getFlow() {
        return flow;
    }

    public void setFlow(ApprovalFlow flow) {
        this.flow = flow;
    }

    public int getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public UUID getApproverUserId() {
        return approverUserId;
    }

    public void setApproverUserId(UUID approverUserId) {
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
}
