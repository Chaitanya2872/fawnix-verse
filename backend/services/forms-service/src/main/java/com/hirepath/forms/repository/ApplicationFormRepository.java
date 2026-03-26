package com.hirepath.forms.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.forms.domain.ApplicationForm;
import com.hirepath.forms.domain.ApplicationFormStatus;

public interface ApplicationFormRepository extends JpaRepository<ApplicationForm, UUID> {

    boolean existsByPublicSlug(String publicSlug);

    List<ApplicationForm> findByCollectionId(String collectionId);

    @EntityGraph(attributePaths = "fields")
    Optional<ApplicationForm> findWithFieldsById(UUID id);

    @Query("""
        select distinct f from ApplicationForm f
        left join fetch f.fields
        where f.publicSlug = :slug
          and f.status = :status
          and (f.module = :module or f.module is null)
          and f.positionId is not null
        """)
    Optional<ApplicationForm> findPublishedBySlug(
        @Param("slug") String slug,
        @Param("status") ApplicationFormStatus status,
        @Param("module") String module
    );
}
