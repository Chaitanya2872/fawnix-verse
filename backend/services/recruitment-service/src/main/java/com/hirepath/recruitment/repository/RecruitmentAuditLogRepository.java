package com.hirepath.recruitment.repository;

import java.util.UUID;

import com.hirepath.recruitment.domain.RecruitmentAuditLog;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RecruitmentAuditLogRepository extends JpaRepository<RecruitmentAuditLog, UUID> {}
