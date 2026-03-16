package com.fawnix.verse.remarks.service;

import com.fawnix.verse.common.exception.ResourceNotFoundException;
import com.fawnix.verse.leads.entity.LeadEntity;
import com.fawnix.verse.remarks.entity.LeadRemarkEntity;
import com.fawnix.verse.remarks.entity.LeadRemarkVersionEntity;
import com.fawnix.verse.users.entity.UserEntity;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class LeadRemarkService {

  public LeadRemarkEntity addRemark(
      LeadEntity lead,
      String content,
      UserEntity actor,
      Instant createdAt
  ) {
    LeadRemarkEntity remark = new LeadRemarkEntity();
    remark.setId(UUID.randomUUID().toString());
    remark.setLead(lead);
    remark.setCreatedByUser(actor);
    remark.setUpdatedByUser(actor);
    remark.setCreatedAt(createdAt);
    remark.setUpdatedAt(createdAt);
    remark.getVersions().add(newVersion(remark, content, actor, createdAt));
    lead.getRemarks().add(0, remark);
    lead.setNotes(content);
    return remark;
  }

  public LeadRemarkEntity editRemark(
      LeadEntity lead,
      String remarkId,
      String content,
      UserEntity actor,
      Instant updatedAt
  ) {
    LeadRemarkEntity remark = lead.getRemarks().stream()
        .filter(item -> item.getId().equals(remarkId))
        .findFirst()
        .orElseThrow(() -> new ResourceNotFoundException("Remark not found"));

    remark.getVersions().add(newVersion(remark, content, actor, updatedAt));
    remark.setUpdatedByUser(actor);
    remark.setUpdatedAt(updatedAt);
    lead.setNotes(content);
    return remark;
  }

  private LeadRemarkVersionEntity newVersion(
      LeadRemarkEntity remark,
      String content,
      UserEntity actor,
      Instant createdAt
  ) {
    LeadRemarkVersionEntity version = new LeadRemarkVersionEntity();
    version.setId(UUID.randomUUID().toString());
    version.setRemark(remark);
    version.setContent(content);
    version.setCreatedByUser(actor);
    version.setCreatedAt(createdAt);
    return version;
  }
}
