package com.hirepath.org.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.org.domain.Vacancy;

public interface VacancyRepository extends JpaRepository<Vacancy, UUID> {}
