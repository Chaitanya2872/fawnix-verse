package com.fawnix.inventory.products.repository;

import com.fawnix.inventory.products.entity.ProductEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductRepository extends JpaRepository<ProductEntity, String>, JpaSpecificationExecutor<ProductEntity> {

  Optional<ProductEntity> findBySku(String sku);

  boolean existsBySku(String sku);
}
