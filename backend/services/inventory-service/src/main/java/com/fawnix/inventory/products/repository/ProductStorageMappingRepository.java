package com.fawnix.inventory.products.repository;

import com.fawnix.inventory.products.entity.ProductStorageMappingEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductStorageMappingRepository extends JpaRepository<ProductStorageMappingEntity, String> {

  List<ProductStorageMappingEntity> findByProduct_IdOrderByPrimaryMappingDescWarehouse_NameAscStorageLocation_NameAsc(String productId);

  boolean existsByWarehouse_Id(String warehouseId);

  boolean existsByStorageLocation_Id(String storageLocationId);
}
