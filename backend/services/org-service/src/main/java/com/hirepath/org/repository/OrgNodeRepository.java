package com.hirepath.org.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.org.domain.OrgNode;

public interface OrgNodeRepository extends JpaRepository<OrgNode, UUID> {}
