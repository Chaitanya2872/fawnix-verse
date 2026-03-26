package com.hirepath.forms.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hirepath.forms.domain.ApplicationFormSubmission;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationFormSubmissionRepository extends JpaRepository<ApplicationFormSubmission, UUID> {
    Optional<ApplicationFormSubmission> findByIdempotencyKey(String idempotencyKey);
    long countByFormId(UUID formId);
    long countByFormIdAndSubmittedAtAfter(UUID formId, OffsetDateTime after);
    List<ApplicationFormSubmission> findBySubmittedAtAfter(OffsetDateTime after);
    Page<ApplicationFormSubmission> findByFormIdOrderBySubmittedAtDesc(UUID formId, Pageable pageable);
}
