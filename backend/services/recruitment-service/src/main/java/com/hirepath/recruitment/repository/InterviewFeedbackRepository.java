package com.hirepath.recruitment.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.recruitment.domain.InterviewFeedback;

public interface InterviewFeedbackRepository extends JpaRepository<InterviewFeedback, UUID> {}

