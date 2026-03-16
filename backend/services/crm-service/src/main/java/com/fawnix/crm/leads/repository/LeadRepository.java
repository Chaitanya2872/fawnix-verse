package com.fawnix.crm.leads.repository;

import com.fawnix.crm.leads.entity.LeadEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface LeadRepository extends JpaRepository<LeadEntity, String>, JpaSpecificationExecutor<LeadEntity> {
}
