package com.fawnix.crm.leads.repository;

import com.fawnix.crm.leads.entity.LeadStatusHistoryEntity;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadStatusHistoryRepository extends JpaRepository<LeadStatusHistoryEntity, String> {

  List<LeadStatusHistoryEntity> findAllByLead_IdOrderByChangedAtAsc(String leadId);

  void deleteAllByLead_Id(String leadId);

  List<LeadStatusHistoryEntity> findAllByLead_IdInOrderByChangedAtAsc(List<String> leadIds);

  List<LeadStatusHistoryEntity> findAllByChangedAtBetweenOrderByChangedAtAsc(
      Instant start,
      Instant end
  );
}
