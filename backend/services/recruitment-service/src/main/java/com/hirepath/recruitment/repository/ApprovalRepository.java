package com.hirepath.recruitment.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.recruitment.domain.Approval;

public interface ApprovalRepository extends JpaRepository<Approval, UUID> {}
