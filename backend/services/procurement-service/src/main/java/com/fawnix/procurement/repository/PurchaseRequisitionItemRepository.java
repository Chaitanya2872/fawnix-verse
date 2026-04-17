package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.PurchaseRequisitionItem;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseRequisitionItemRepository extends JpaRepository<PurchaseRequisitionItem, UUID> {

  List<PurchaseRequisitionItem> findByPurchaseRequisitionId(UUID purchaseRequisitionId);
}
