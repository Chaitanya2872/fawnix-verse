package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.ApprovalLog;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalLogRepository extends JpaRepository<ApprovalLog, UUID> {

  void deleteByEntityTypeAndEntityId(String entityType, UUID entityId);
}
