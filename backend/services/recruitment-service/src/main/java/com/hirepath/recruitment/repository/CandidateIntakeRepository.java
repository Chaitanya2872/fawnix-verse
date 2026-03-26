package com.hirepath.recruitment.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hirepath.recruitment.domain.CandidateIntake;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateIntakeRepository extends JpaRepository<CandidateIntake, UUID> {
    Optional<CandidateIntake> findTopByVacancyIdAndEmailIgnoreCaseOrderByCreatedAtDesc(UUID vacancyId, String email);
    Optional<CandidateIntake> findTopByVacancyIdAndDedupeHashOrderByCreatedAtDesc(UUID vacancyId, String dedupeHash);
    List<CandidateIntake> findByVacancyId(UUID vacancyId);
}
