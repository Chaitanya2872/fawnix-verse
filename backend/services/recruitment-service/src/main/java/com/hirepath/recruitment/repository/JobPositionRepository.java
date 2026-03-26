package com.hirepath.recruitment.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.recruitment.domain.JobPosition;
import com.hirepath.recruitment.domain.JobStatus;

public interface JobPositionRepository extends JpaRepository<JobPosition, UUID> {
    Optional<JobPosition> findByHiringRequest_Id(UUID hiringRequestId);
    List<JobPosition> findByStatus(JobStatus status);
    List<JobPosition> findByStatusNot(JobStatus status);
}
