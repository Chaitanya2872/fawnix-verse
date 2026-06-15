package com.fawnix.sales.orders.repository;

import com.fawnix.sales.orders.entity.SalesOrderAuditLogEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesOrderAuditLogRepository extends JpaRepository<SalesOrderAuditLogEntity, String> {

  List<SalesOrderAuditLogEntity> findTop50BySalesOrderIdOrderByCreatedAtDesc(String salesOrderId);
}
