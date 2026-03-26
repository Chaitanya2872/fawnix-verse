package com.hirepath.approval.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.approval.domain.ApprovalFlow;

public interface ApprovalFlowRepository extends JpaRepository<ApprovalFlow, UUID> {}
