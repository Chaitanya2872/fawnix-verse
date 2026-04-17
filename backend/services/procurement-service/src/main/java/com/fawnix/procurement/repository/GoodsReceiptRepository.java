package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.GoodsReceipt;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, UUID> {

  boolean existsByPurchaseOrderId(UUID purchaseOrderId);
}
