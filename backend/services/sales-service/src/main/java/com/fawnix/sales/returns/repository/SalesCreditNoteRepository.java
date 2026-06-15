package com.fawnix.sales.returns.repository;

import com.fawnix.sales.returns.entity.SalesCreditNoteEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesCreditNoteRepository extends JpaRepository<SalesCreditNoteEntity, String> {

  boolean existsByCreditNoteNumber(String creditNoteNumber);

  List<SalesCreditNoteEntity> findBySalesReturnIdOrderByCreatedAtDesc(String salesReturnId);
}
