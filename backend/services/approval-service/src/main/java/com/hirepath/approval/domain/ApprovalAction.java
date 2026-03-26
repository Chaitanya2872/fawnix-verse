package com.hirepath.approval.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

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
@Table(name = "approval_actions")
public class ApprovalAction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "request_id", nullable = false)
    private ApprovalRequest request;

    @ManyToOne
    @JoinColumn(name = "stage_id")
    private ApprovalRequestStage stage;

    @Column(name = "actor_id")
    private String actorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    private ApprovalActionType actionType;

    @Column(name = "previous_status")
    private String previousStatus;

    @Column(name = "new_status")
    private String newStatus;

    @Column(name = "comment")
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public ApprovalRequest getRequest() {
        return request;
    }

    public void setRequest(ApprovalRequest request) {
        this.request = request;
    }

    public ApprovalRequestStage getStage() {
        return stage;
    }

    public void setStage(ApprovalRequestStage stage) {
        this.stage = stage;
    }

    public String getActorId() {
        return actorId;
    }

    public void setActorId(String actorId) {
        this.actorId = actorId;
    }

    public ApprovalActionType getActionType() {
        return actionType;
    }

    public void setActionType(ApprovalActionType actionType) {
        this.actionType = actionType;
    }

    public String getPreviousStatus() {
        return previousStatus;
    }

    public void setPreviousStatus(String previousStatus) {
        this.previousStatus = previousStatus;
    }

    public String getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(String newStatus) {
        this.newStatus = newStatus;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
