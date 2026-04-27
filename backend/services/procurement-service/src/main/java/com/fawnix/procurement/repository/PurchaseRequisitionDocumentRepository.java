package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.PurchaseRequisitionDocument;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseRequisitionDocumentRepository extends JpaRepository<PurchaseRequisitionDocument, UUID> {

  List<PurchaseRequisitionDocument> findAllByPurchaseRequisitionIdOrderByCreatedAtDesc(UUID purchaseRequisitionId);

  Optional<PurchaseRequisitionDocument> findByIdAndPurchaseRequisitionId(UUID id, UUID purchaseRequisitionId);

  void deleteByPurchaseRequisitionId(UUID purchaseRequisitionId);
}
