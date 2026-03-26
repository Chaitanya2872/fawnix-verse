package com.hirepath.forms.repository;

import java.util.Optional;
import java.util.UUID;

import com.hirepath.forms.domain.ApplicationFormVersion;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationFormVersionRepository extends JpaRepository<ApplicationFormVersion, UUID> {
    Optional<ApplicationFormVersion> findTopByFormIdOrderByCreatedAtDesc(UUID formId);
}
