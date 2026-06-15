package com.fawnix.sales.orders.repository;

import com.fawnix.sales.orders.entity.SalesOrderApprovalRuleEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesOrderApprovalRuleRepository extends JpaRepository<SalesOrderApprovalRuleEntity, String> {

  List<SalesOrderApprovalRuleEntity> findByActiveTrueOrderBySequenceNoAsc();
}
