package com.fawnix.inventory.transactions.repository;

import com.fawnix.inventory.transactions.entity.StockTransactionEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockTransactionRepository extends JpaRepository<StockTransactionEntity, String> {

  List<StockTransactionEntity> findByProduct_Id(String productId);
}
