package com.fawnix.crm.leads.repository;

import com.fawnix.crm.leads.entity.LeadEntity;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface LeadRepository extends JpaRepository<LeadEntity, String>, JpaSpecificationExecutor<LeadEntity> {

  @Query("""
      select l from LeadEntity l
      where l.followUpAt is not null
        and l.followUpAt <= :cutoff
        and l.followUpReminderSentAt is null
        and l.status <> com.fawnix.crm.leads.entity.LeadStatus.CONVERTED
        and l.status <> com.fawnix.crm.leads.entity.LeadStatus.LOST
      """)
  List<LeadEntity> findLeadsNeedingFollowUp(@Param("cutoff") Instant cutoff);

  java.util.Optional<LeadEntity> findFirstByEmailIgnoreCase(String email);

  java.util.Optional<LeadEntity> findFirstByPhone(String phone);

  java.util.Optional<LeadEntity> findFirstByExternalLeadId(String externalLeadId);

  java.util.Optional<LeadEntity> findFirstByMetaLeadId(String metaLeadId);
}
