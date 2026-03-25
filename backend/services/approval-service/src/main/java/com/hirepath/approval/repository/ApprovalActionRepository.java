package com.hirepath.approval.repository;

import java.util.UUID;

import com.hirepath.approval.domain.ApprovalAction;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalActionRepository extends JpaRepository<ApprovalAction, UUID> {}
