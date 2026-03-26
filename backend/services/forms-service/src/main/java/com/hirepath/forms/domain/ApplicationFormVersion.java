package com.hirepath.forms.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "application_form_versions")
public class ApplicationFormVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "form_id", nullable = false)
    private UUID formId;

    @Column(name = "version", nullable = false)
    private String version;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "schema_snapshot", columnDefinition = "jsonb", nullable = false)
    private List<Map<String, Object>> schemaSnapshot;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public UUID getFormId() {
        return formId;
    }

    public void setFormId(UUID formId) {
        this.formId = formId;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public List<Map<String, Object>> getSchemaSnapshot() {
        return schemaSnapshot;
    }

    public void setSchemaSnapshot(List<Map<String, Object>> schemaSnapshot) {
        this.schemaSnapshot = schemaSnapshot;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
