package com.fawnix.verse.leads.controller;

import com.fawnix.verse.leads.dto.LeadDtos;
import com.fawnix.verse.leads.service.LeadService;
import com.fawnix.verse.security.service.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leads")
public class LeadController {

  private final LeadService leadService;

  public LeadController(LeadService leadService) {
    this.leadService = leadService;
  }

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public LeadDtos.PaginatedLeadResponse getLeads(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "ALL") String status,
      @RequestParam(defaultValue = "ALL") String source,
      @RequestParam(defaultValue = "ALL") String priority,
      @RequestParam(defaultValue = "") String assignedTo,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int pageSize
  ) {
    return leadService.getLeads(search, status, source, priority, assignedTo, page, pageSize);
  }

  @GetMapping("/{id}")
  @PreAuthorize("isAuthenticated()")
  public LeadDtos.LeadResponse getLead(@PathVariable String id) {
    return leadService.getLead(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public LeadDtos.LeadResponse createLead(
      @Valid @RequestBody LeadDtos.CreateLeadRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return leadService.createLead(request, userDetails);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER') or @leadSecurityService.canManageLead(authentication, #id)")
  public LeadDtos.LeadResponse updateLead(
      @PathVariable String id,
      @Valid @RequestBody LeadDtos.UpdateLeadRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return leadService.updateLead(id, request, userDetails);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public ResponseEntity<Void> deleteLead(@PathVariable String id) {
    leadService.deleteLead(id);
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER') or @leadSecurityService.canManageLead(authentication, #id)")
  public LeadDtos.LeadResponse updateStatus(
      @PathVariable String id,
      @Valid @RequestBody LeadDtos.UpdateLeadStatusRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return leadService.updateStatus(id, request, userDetails);
  }

  @PatchMapping("/{id}/assign")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER') or @leadSecurityService.canManageLead(authentication, #id)")
  public LeadDtos.LeadResponse assignLead(
      @PathVariable String id,
      @Valid @RequestBody LeadDtos.AssignLeadRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return leadService.assignLead(id, request, userDetails);
  }

  @PatchMapping("/{id}/priority")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER') or @leadSecurityService.canManageLead(authentication, #id)")
  public LeadDtos.LeadResponse updatePriority(
      @PathVariable String id,
      @Valid @RequestBody LeadDtos.UpdateLeadPriorityRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return leadService.updatePriority(id, request, userDetails);
  }

  @PostMapping("/{id}/remarks")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER') or @leadSecurityService.canManageLead(authentication, #id)")
  public LeadDtos.LeadResponse addRemark(
      @PathVariable String id,
      @Valid @RequestBody LeadDtos.CreateRemarkRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return leadService.addRemark(id, request, userDetails);
  }

  @PatchMapping("/{id}/remarks/{remarkId}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER') or @leadSecurityService.canManageLead(authentication, #id)")
  public LeadDtos.LeadResponse editRemark(
      @PathVariable String id,
      @PathVariable String remarkId,
      @Valid @RequestBody LeadDtos.EditRemarkRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return leadService.editRemark(id, remarkId, request, userDetails);
  }
}
