package com.fawnix.verse.remarks.repository;

import com.fawnix.verse.remarks.entity.LeadRemarkEntity;
import com.fawnix.verse.remarks.entity.LeadRemarkVersionEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadRemarkVersionRepository extends JpaRepository<LeadRemarkVersionEntity, String> {

  List<LeadRemarkVersionEntity> findAllByRemarkOrderByCreatedAtAsc(LeadRemarkEntity remark);
}
