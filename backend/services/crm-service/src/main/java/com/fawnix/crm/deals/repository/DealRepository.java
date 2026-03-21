package com.fawnix.crm.deals.repository;

import com.fawnix.crm.deals.entity.DealEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DealRepository extends JpaRepository<DealEntity, String>,
    JpaSpecificationExecutor<DealEntity> {
}
