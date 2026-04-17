package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.ApprovalStep;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalStepRepository extends JpaRepository<ApprovalStep, UUID> {

  List<ApprovalStep> findByWorkflowIdOrderByStepOrderAsc(UUID workflowId);

  Optional<ApprovalStep> findByWorkflowIdAndStepOrder(UUID workflowId, Integer stepOrder);
}
