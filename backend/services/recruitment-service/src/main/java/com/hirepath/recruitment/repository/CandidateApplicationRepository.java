package com.hirepath.recruitment.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.recruitment.domain.CandidateApplication;

public interface CandidateApplicationRepository extends JpaRepository<CandidateApplication, UUID> {
    Optional<CandidateApplication> findByCandidate_IdAndPosition_Id(UUID candidateId, UUID positionId);
    Optional<CandidateApplication> findByIntake_Id(UUID intakeId);
    Optional<CandidateApplication> findTopByDedupeKey(String dedupeKey);
    long countByPosition_Id(UUID positionId);
    List<CandidateApplication> findByPosition_Id(UUID positionId);
}
