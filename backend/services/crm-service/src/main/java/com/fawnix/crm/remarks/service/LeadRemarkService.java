package com.fawnix.crm.remarks.service;

import com.fawnix.crm.common.exception.ResourceNotFoundException;
import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.security.service.AppUserDetails;
import com.fawnix.crm.remarks.entity.LeadRemarkEntity;
import com.fawnix.crm.remarks.entity.LeadRemarkVersionEntity;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class LeadRemarkService {

  public LeadRemarkEntity addRemark(
      LeadEntity lead,
      String content,
      AppUserDetails actor,
      Instant createdAt
  ) {
    LeadRemarkEntity remark = new LeadRemarkEntity();
    remark.setId(UUID.randomUUID().toString());
    remark.setLead(lead);
    remark.setCreatedByUserId(actor.getUserId());
    remark.setCreatedByName(actor.getFullName());
    remark.setUpdatedByUserId(actor.getUserId());
    remark.setUpdatedByName(actor.getFullName());
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
      AppUserDetails actor,
      Instant updatedAt
  ) {
    LeadRemarkEntity remark = lead.getRemarks().stream()
        .filter(item -> item.getId().equals(remarkId))
        .findFirst()
        .orElseThrow(() -> new ResourceNotFoundException("Remark not found"));

    remark.getVersions().add(newVersion(remark, content, actor, updatedAt));
    remark.setUpdatedByUserId(actor.getUserId());
    remark.setUpdatedByName(actor.getFullName());
    remark.setUpdatedAt(updatedAt);
    lead.setNotes(content);
    return remark;
  }

  private LeadRemarkVersionEntity newVersion(
      LeadRemarkEntity remark,
      String content,
      AppUserDetails actor,
      Instant createdAt
  ) {
    LeadRemarkVersionEntity version = new LeadRemarkVersionEntity();
    version.setId(UUID.randomUUID().toString());
    version.setRemark(remark);
    version.setContent(content);
    version.setCreatedByUserId(actor.getUserId());
    version.setCreatedByName(actor.getFullName());
    version.setCreatedAt(createdAt);
    return version;
  }
}
