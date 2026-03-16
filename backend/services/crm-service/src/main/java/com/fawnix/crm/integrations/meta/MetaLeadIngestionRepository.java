package com.fawnix.crm.integrations.meta;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MetaLeadIngestionRepository extends JpaRepository<MetaLeadIngestionEntity, String> {
  boolean existsByLeadgenId(String leadgenId);
}
