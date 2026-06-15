package com.fawnix.sales.orders.repository;

import com.fawnix.sales.orders.entity.SalesOrderApprovalEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesOrderApprovalRepository extends JpaRepository<SalesOrderApprovalEntity, String> {

  List<SalesOrderApprovalEntity> findBySalesOrderIdOrderBySequenceNoAscCreatedAtAsc(String salesOrderId);
}
