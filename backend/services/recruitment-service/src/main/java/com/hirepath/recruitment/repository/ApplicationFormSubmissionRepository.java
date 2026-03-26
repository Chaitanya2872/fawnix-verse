package com.hirepath.recruitment.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.recruitment.domain.ApplicationFormSubmission;

public interface ApplicationFormSubmissionRepository extends JpaRepository<ApplicationFormSubmission, UUID> {

    @Override
    @EntityGraph(attributePaths = {"candidate", "application", "application.position"})
    List<ApplicationFormSubmission> findAll();
}
