package com.hirepath.forms.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.forms.domain.ApplicationFormTemplate;

public interface ApplicationFormTemplateRepository extends JpaRepository<ApplicationFormTemplate, UUID> {}
