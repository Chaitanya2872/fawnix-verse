package com.fawnix.crm.leads.controller;

import com.fawnix.crm.leads.dto.LeadDtos;
import com.fawnix.crm.leads.service.LeadScheduleService;
import com.fawnix.crm.security.service.AppUserDetails;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leads/{leadId}/schedules")
public class LeadScheduleController {

  private final LeadScheduleService scheduleService;

  public LeadScheduleController(LeadScheduleService scheduleService) {
    this.scheduleService = scheduleService;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER') or @leadSecurityService.canManageLead(authentication, #leadId)")
  public List<LeadDtos.LeadScheduleResponse> getSchedules(@PathVariable String leadId) {
    return scheduleService.getSchedules(leadId);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER') or @leadSecurityService.canManageLead(authentication, #leadId)")
  public LeadDtos.LeadScheduleResponse createSchedule(
      @PathVariable String leadId,
      @Valid @RequestBody LeadDtos.CreateLeadScheduleRequest request,
      @AuthenticationPrincipal AppUserDetails actor
  ) {
    return scheduleService.createSchedule(leadId, request, actor);
  }

  @PatchMapping("/{scheduleId}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER') or @leadSecurityService.canManageLead(authentication, #leadId)")
  public LeadDtos.LeadScheduleResponse updateSchedule(
      @PathVariable String leadId,
      @PathVariable String scheduleId,
      @Valid @RequestBody LeadDtos.UpdateLeadScheduleRequest request,
      @AuthenticationPrincipal AppUserDetails actor
  ) {
    return scheduleService.updateSchedule(leadId, scheduleId, request, actor);
  }
}
