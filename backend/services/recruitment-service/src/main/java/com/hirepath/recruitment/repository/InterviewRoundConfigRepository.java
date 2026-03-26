package com.hirepath.recruitment.repository;

import java.util.List;
import java.util.UUID;

import com.hirepath.recruitment.domain.InterviewRoundConfigEntity;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewRoundConfigRepository extends JpaRepository<InterviewRoundConfigEntity, UUID> {
    List<InterviewRoundConfigEntity> findByVacancyIdOrderByRoundNumberAsc(UUID vacancyId);
    long countByVacancyIdAndRequiredTrue(UUID vacancyId);
}
