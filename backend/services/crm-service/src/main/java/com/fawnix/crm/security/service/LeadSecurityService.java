package com.fawnix.crm.security.service;

import com.fawnix.crm.leads.repository.LeadRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("leadSecurityService")
public class LeadSecurityService {

  private final LeadRepository leadRepository;

  public LeadSecurityService(LeadRepository leadRepository) {
    this.leadRepository = leadRepository;
  }

  public boolean canManageLead(Authentication authentication, String leadId) {
    if (authentication == null || !(authentication.getPrincipal() instanceof AppUserDetails details)) {
      return false;
    }

    boolean adminLike = details.getRoleNames().stream()
        .anyMatch(role -> role.equals("ROLE_ADMIN")
            || role.equals("ROLE_REPORTING_MANAGER")
            || role.equals("ROLE_SALES_MANAGER"));
    if (adminLike) {
      return true;
    }

    return leadRepository.findById(leadId)
        .map(lead -> lead.getAssignedToUserId() != null
            && lead.getAssignedToUserId().equalsIgnoreCase(details.getUserId()))
        .orElse(false);
  }
}
