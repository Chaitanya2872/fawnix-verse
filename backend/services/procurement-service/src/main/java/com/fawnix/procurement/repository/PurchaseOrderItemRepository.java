package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.PurchaseOrderItem;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, UUID> {

  List<PurchaseOrderItem> findByPurchaseOrderId(UUID purchaseOrderId);
}
