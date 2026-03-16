package com.fawnix.crm.activities.repository;

import com.fawnix.crm.activities.entity.LeadActivityEntity;
import com.fawnix.crm.leads.entity.LeadEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadActivityRepository extends JpaRepository<LeadActivityEntity, String> {

  List<LeadActivityEntity> findAllByLeadOrderByCreatedAtDesc(LeadEntity lead);
}
