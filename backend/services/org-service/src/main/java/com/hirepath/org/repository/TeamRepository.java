package com.hirepath.org.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.org.domain.Team;

public interface TeamRepository extends JpaRepository<Team, UUID> {}
