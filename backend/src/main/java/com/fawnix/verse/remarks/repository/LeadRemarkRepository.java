package com.fawnix.verse.remarks.repository;

import com.fawnix.verse.leads.entity.LeadEntity;
import com.fawnix.verse.remarks.entity.LeadRemarkEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadRemarkRepository extends JpaRepository<LeadRemarkEntity, String> {

  List<LeadRemarkEntity> findAllByLeadOrderByUpdatedAtDesc(LeadEntity lead);
}
