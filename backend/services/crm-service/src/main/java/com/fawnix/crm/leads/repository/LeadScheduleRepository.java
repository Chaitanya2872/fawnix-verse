package com.fawnix.crm.leads.repository;

import com.fawnix.crm.leads.entity.LeadScheduleEntity;
import com.fawnix.crm.leads.entity.LeadScheduleStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadScheduleRepository extends JpaRepository<LeadScheduleEntity, String> {

  List<LeadScheduleEntity> findByLeadIdOrderByScheduledAtDesc(String leadId);

  List<LeadScheduleEntity> findByStatusInAndScheduledAtBetweenOrderByScheduledAtAsc(
      List<LeadScheduleStatus> statuses,
      Instant start,
      Instant end
  );

  List<LeadScheduleEntity> findByStatusInAndScheduledAtBeforeOrderByScheduledAtAsc(
      List<LeadScheduleStatus> statuses,
      Instant cutoff
  );

  List<LeadScheduleEntity> findByStatusInAndScheduledAtAfterOrderByScheduledAtAsc(
      List<LeadScheduleStatus> statuses,
      Instant cutoff
  );
}
