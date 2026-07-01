package com.fawnix.inventory.warehouses.repository;

import com.fawnix.inventory.warehouses.entity.WarehouseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface WarehouseRepository extends JpaRepository<WarehouseEntity, String>, JpaSpecificationExecutor<WarehouseEntity> {

  boolean existsByCodeIgnoreCase(String code);
}
