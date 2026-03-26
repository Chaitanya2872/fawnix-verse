package com.hirepath.recruitment.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.recruitment.domain.Interview;

public interface InterviewRepository extends JpaRepository<Interview, UUID> {
    @EntityGraph(attributePaths = {"interviewers", "feedback", "application", "application.candidate", "application.position"})
    List<Interview> findAll(Sort sort);

    @EntityGraph(attributePaths = {"interviewers", "feedback", "application", "application.candidate", "application.position"})
    Optional<Interview> findById(UUID id);
}
