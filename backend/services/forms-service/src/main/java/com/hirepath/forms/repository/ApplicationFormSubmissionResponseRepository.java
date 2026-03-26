package com.hirepath.forms.repository;

import java.util.UUID;

import com.hirepath.forms.domain.ApplicationFormSubmissionResponse;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationFormSubmissionResponseRepository extends JpaRepository<ApplicationFormSubmissionResponse, UUID> {}
