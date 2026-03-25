package com.hirepath.org.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.org.domain.SetupConfig;

public interface SetupConfigRepository extends JpaRepository<SetupConfig, UUID> {}
