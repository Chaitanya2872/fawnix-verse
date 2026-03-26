package com.hirepath.recruitment.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hirepath.recruitment.domain.PipelineStage;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PipelineStageRepository extends JpaRepository<PipelineStage, UUID> {
    List<PipelineStage> findByVacancyIdOrderByOrderIndexAsc(UUID vacancyId);
    Optional<PipelineStage> findTopByVacancyIdAndCategoryIgnoreCase(UUID vacancyId, String category);
}
