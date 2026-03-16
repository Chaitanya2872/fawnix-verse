package com.fawnix.crm.reports.controller;

import com.fawnix.crm.reports.dto.ReportDtos;
import com.fawnix.crm.reports.service.ReportsService;
import com.fawnix.crm.security.service.AppUserDetails;
import java.time.Instant;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportsController {

  private final ReportsService reportsService;

  public ReportsController(ReportsService reportsService) {
    this.reportsService = reportsService;
  }

  @GetMapping("/overview")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public ReportDtos.OverviewResponse getOverview(
      @RequestParam(required = false) Instant start,
      @RequestParam(required = false) Instant end
  ) {
    return reportsService.getOverview(start, end);
  }

  @GetMapping("/presales")
  @PreAuthorize("isAuthenticated()")
  public ReportDtos.PreSalesOverviewResponse getPreSalesOverview(
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return reportsService.getPreSalesOverview(userDetails);
  }
}
