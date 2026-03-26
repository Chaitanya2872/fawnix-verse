package com.hirepath.recruitment.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "pipeline_history")
public class PipelineHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @Column(name = "from_stage_id")
    private UUID fromStageId;

    @Column(name = "to_stage_id")
    private UUID toStageId;

    @Column(name = "moved_by")
    private String movedBy;

    @Column(name = "moved_at")
    private OffsetDateTime movedAt;

    private String reason;

    public UUID getId() {
        return id;
    }

    public UUID getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(UUID applicationId) {
        this.applicationId = applicationId;
    }

    public UUID getFromStageId() {
        return fromStageId;
    }

    public void setFromStageId(UUID fromStageId) {
        this.fromStageId = fromStageId;
    }

    public UUID getToStageId() {
        return toStageId;
    }

    public void setToStageId(UUID toStageId) {
        this.toStageId = toStageId;
    }

    public String getMovedBy() {
        return movedBy;
    }

    public void setMovedBy(String movedBy) {
        this.movedBy = movedBy;
    }

    public OffsetDateTime getMovedAt() {
        return movedAt;
    }

    public void setMovedAt(OffsetDateTime movedAt) {
        this.movedAt = movedAt;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
