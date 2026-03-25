package com.hirepath.recruitment.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.recruitment.domain.JobPosting;

public interface JobPostingRepository extends JpaRepository<JobPosting, UUID> {

    @Override
    @EntityGraph(attributePaths = {"platformsMeta", "position"})
    List<JobPosting> findAll(Sort sort);

    @EntityGraph(attributePaths = {"platformsMeta", "position"})
    Optional<JobPosting> findWithPlatformsById(UUID id);

    Optional<JobPosting> findTopByPosition_IdOrderByCreatedAtDesc(UUID positionId);
}
