package com.hirepath.recruitment.repository;

import java.util.Optional;
import java.util.UUID;

import com.hirepath.recruitment.domain.ApplicationDecision;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationDecisionRepository extends JpaRepository<ApplicationDecision, UUID> {
    Optional<ApplicationDecision> findByApplicationId(UUID applicationId);
}
