package com.hirepath.recruitment.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.recruitment.domain.HiringRequest;

public interface HiringRequestRepository extends JpaRepository<HiringRequest, UUID> {

    @Override
    @EntityGraph(attributePaths = {"approvals"})
    List<HiringRequest> findAll(Sort sort);

    @EntityGraph(attributePaths = {"approvals", "jobPosition"})
    Optional<HiringRequest> findWithApprovalsById(UUID id);
}
