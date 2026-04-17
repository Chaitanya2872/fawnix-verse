package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.PurchaseRequisition;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseRequisitionRepository extends JpaRepository<PurchaseRequisition, UUID> {
}
