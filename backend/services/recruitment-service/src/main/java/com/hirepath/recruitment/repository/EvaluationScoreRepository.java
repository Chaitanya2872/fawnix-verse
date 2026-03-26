package com.hirepath.recruitment.repository;

import java.util.List;
import java.util.UUID;

import com.hirepath.recruitment.domain.EvaluationScore;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EvaluationScoreRepository extends JpaRepository<EvaluationScore, UUID> {
    List<EvaluationScore> findByApplicationId(UUID applicationId);
    long countByApplicationId(UUID applicationId);
}
