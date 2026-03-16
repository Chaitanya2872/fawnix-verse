package com.fawnix.crm.remarks.repository;

import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.remarks.entity.LeadRemarkEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadRemarkRepository extends JpaRepository<LeadRemarkEntity, String> {

  List<LeadRemarkEntity> findAllByLeadOrderByUpdatedAtDesc(LeadEntity lead);
}
