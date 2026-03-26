package com.hirepath.forms.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

import com.hirepath.forms.domain.ApplicationFormLink;

public interface ApplicationFormLinkRepository extends JpaRepository<ApplicationFormLink, UUID> {
    Optional<ApplicationFormLink> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
