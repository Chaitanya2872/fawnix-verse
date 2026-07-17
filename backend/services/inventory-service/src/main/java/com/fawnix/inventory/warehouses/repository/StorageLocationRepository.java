package com.fawnix.inventory.warehouses.repository;

import com.fawnix.inventory.warehouses.entity.StorageLocationEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StorageLocationRepository extends JpaRepository<StorageLocationEntity, String> {

  List<StorageLocationEntity> findByWarehouse_IdOrderByNameAsc(String warehouseId);

  boolean existsByWarehouse_IdAndCodeIgnoreCase(String warehouseId, String code);

  Optional<StorageLocationEntity> findByIdAndWarehouse_Id(String id, String warehouseId);
}
