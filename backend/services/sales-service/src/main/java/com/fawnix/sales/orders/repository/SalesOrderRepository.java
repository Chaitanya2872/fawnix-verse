package com.fawnix.sales.orders.repository;

import com.fawnix.sales.orders.entity.SalesOrderEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SalesOrderRepository extends JpaRepository<SalesOrderEntity, String>, JpaSpecificationExecutor<SalesOrderEntity> {
  boolean existsByOrderNumber(String orderNumber);

  Optional<SalesOrderEntity> findByQuoteId(String quoteId);
}
