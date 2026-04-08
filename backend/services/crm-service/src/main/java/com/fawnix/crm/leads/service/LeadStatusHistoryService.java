package com.fawnix.crm.leads.service;

import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.leads.entity.LeadStatus;
import com.fawnix.crm.leads.entity.LeadStatusHistoryEntity;
import com.fawnix.crm.leads.repository.LeadStatusHistoryRepository;
import com.fawnix.crm.security.service.AppUserDetails;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class LeadStatusHistoryService {

  private final LeadStatusHistoryRepository historyRepository;

  public LeadStatusHistoryService(LeadStatusHistoryRepository historyRepository) {
    this.historyRepository = historyRepository;
  }

  public void recordInitial(LeadEntity lead, LeadStatus status, AppUserDetails actor, Instant now) {
    LeadStatusHistoryEntity entry = new LeadStatusHistoryEntity();
    entry.setId(UUID.randomUUID().toString());
    entry.setLead(lead);
    entry.setFromStatus(null);
    entry.setToStatus(status);
    entry.setChangedByUserId(actor.getUserId());
    entry.setChangedByName(actor.getFullName());
    entry.setNote(null);
    entry.setChangedAt(now);
    historyRepository.save(entry);
  }

  public void recordTransition(
      LeadEntity lead,
      LeadStatus fromStatus,
      LeadStatus toStatus,
      AppUserDetails actor,
      Instant now,
      String note
  ) {
    LeadStatusHistoryEntity entry = new LeadStatusHistoryEntity();
    entry.setId(UUID.randomUUID().toString());
    entry.setLead(lead);
    entry.setFromStatus(fromStatus);
    entry.setToStatus(toStatus);
    entry.setChangedByUserId(actor.getUserId());
    entry.setChangedByName(actor.getFullName());
    entry.setNote(note);
    entry.setChangedAt(now);
    historyRepository.save(entry);
  }

  public List<LeadStatusHistoryEntity> getLeadHistory(String leadId) {
    return historyRepository.findAllByLead_IdOrderByChangedAtAsc(leadId);
  }

  public void deleteForLead(String leadId) {
    historyRepository.deleteAllByLead_Id(leadId);
  }
}
