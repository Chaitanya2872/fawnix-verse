package com.hirepath.recruitment.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.recruitment.domain.InterviewPanel;

public interface InterviewPanelRepository extends JpaRepository<InterviewPanel, UUID> {}

