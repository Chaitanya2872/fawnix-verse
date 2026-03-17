package com.fawnix.crm.leads.repository;

import com.fawnix.crm.leads.entity.LeadScheduleEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadScheduleRepository extends JpaRepository<LeadScheduleEntity, String> {

  List<LeadScheduleEntity> findByLeadIdOrderByScheduledAtDesc(String leadId);
}
