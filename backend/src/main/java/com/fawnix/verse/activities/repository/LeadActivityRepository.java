package com.fawnix.verse.activities.repository;

import com.fawnix.verse.activities.entity.LeadActivityEntity;
import com.fawnix.verse.leads.entity.LeadEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadActivityRepository extends JpaRepository<LeadActivityEntity, String> {

  List<LeadActivityEntity> findAllByLeadOrderByCreatedAtDesc(LeadEntity lead);
}
