package com.hirepath.recruitment.repository;

import java.util.List;
import java.util.UUID;

import com.hirepath.recruitment.domain.PipelineHistory;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PipelineHistoryRepository extends JpaRepository<PipelineHistory, UUID> {
    List<PipelineHistory> findByApplicationIdOrderByMovedAtDesc(UUID applicationId);
}
