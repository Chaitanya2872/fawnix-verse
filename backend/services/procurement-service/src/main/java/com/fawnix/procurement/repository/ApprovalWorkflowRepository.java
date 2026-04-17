package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.ApprovalWorkflow;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalWorkflowRepository extends JpaRepository<ApprovalWorkflow, UUID> {

  Optional<ApprovalWorkflow> findFirstByModuleAndActiveTrue(String module);
}
