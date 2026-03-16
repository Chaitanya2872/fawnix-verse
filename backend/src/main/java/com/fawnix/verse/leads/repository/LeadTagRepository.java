package com.fawnix.verse.leads.repository;

import com.fawnix.verse.leads.entity.LeadEntity;
import com.fawnix.verse.leads.entity.LeadTagEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadTagRepository extends JpaRepository<LeadTagEntity, String> {

  void deleteByLead(LeadEntity lead);

  List<LeadTagEntity> findAllByLeadOrderByCreatedAtAsc(LeadEntity lead);
}
