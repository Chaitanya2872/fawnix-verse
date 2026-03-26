package com.hirepath.recruitment.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.recruitment.domain.Candidate;

public interface CandidateRepository extends JpaRepository<Candidate, UUID> {
    Optional<Candidate> findByEmail(String email);
}
