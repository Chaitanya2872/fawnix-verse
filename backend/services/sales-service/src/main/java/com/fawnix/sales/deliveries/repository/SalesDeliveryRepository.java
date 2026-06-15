package com.fawnix.sales.deliveries.repository;

import com.fawnix.sales.deliveries.entity.SalesDeliveryEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesDeliveryRepository extends JpaRepository<SalesDeliveryEntity, String> {
  boolean existsByDeliveryNumber(String deliveryNumber);
  List<SalesDeliveryEntity> findTop20ByOrderByCreatedAtDesc();
  List<SalesDeliveryEntity> findTop20BySalesOrderIdOrderByCreatedAtDesc(String salesOrderId);
  List<SalesDeliveryEntity> findBySalesOrderIdOrderByCreatedAtDesc(String salesOrderId);
}
