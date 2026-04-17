package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.PurchaseOrder;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {

  Optional<PurchaseOrder> findByPurchaseRequisitionId(UUID purchaseRequisitionId);
}
