package com.hirepath.forms.domain;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "application_forms")
public class ApplicationForm {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "position_id")
    private String positionId;

    @Column(nullable = false)
    private String module = "recruitment";

    private String owner = "HR Operations";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "visibility", columnDefinition = "jsonb")
    private List<String> visibility = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags", columnDefinition = "jsonb")
    private List<String> tags = new ArrayList<>();

    private String version = "v1.0";

    @Column(name = "collection_id")
    private String collectionId;

    @Enumerated(EnumType.STRING)
    private ApplicationFormStatus status = ApplicationFormStatus.DRAFT;

    @Column(name = "public_slug", unique = true)
    private String publicSlug;

    @Column(name = "created_by")
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @JsonIgnore
    @OneToMany(mappedBy = "form", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ApplicationFormField> fields = new ArrayList<>();

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPositionId() {
        return positionId;
    }

    public void setPositionId(String positionId) {
        this.positionId = positionId;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public String getOwner() {
        return owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
    }

    public List<String> getVisibility() {
        return visibility;
    }

    public void setVisibility(List<String> visibility) {
        this.visibility = visibility;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getCollectionId() {
        return collectionId;
    }

    public void setCollectionId(String collectionId) {
        this.collectionId = collectionId;
    }

    public ApplicationFormStatus getStatus() {
        return status;
    }

    public void setStatus(ApplicationFormStatus status) {
        this.status = status;
    }

    public String getPublicSlug() {
        return publicSlug;
    }

    public void setPublicSlug(String publicSlug) {
        this.publicSlug = publicSlug;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public List<ApplicationFormField> getFields() {
        return fields;
    }

    public void setFields(List<ApplicationFormField> fields) {
        this.fields = fields;
    }
}
