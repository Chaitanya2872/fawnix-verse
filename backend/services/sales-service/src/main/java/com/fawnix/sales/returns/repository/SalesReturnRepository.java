package com.fawnix.sales.returns.repository;

import com.fawnix.sales.returns.entity.SalesReturnEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesReturnRepository extends JpaRepository<SalesReturnEntity, String> {

  boolean existsByReturnNumber(String returnNumber);

  List<SalesReturnEntity> findTop50ByOrderByCreatedAtDesc();

  List<SalesReturnEntity> findTop50BySalesOrderIdOrderByCreatedAtDesc(String salesOrderId);
}
