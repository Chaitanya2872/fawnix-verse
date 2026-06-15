package com.fawnix.sales.reports.controller;

import com.fawnix.sales.reports.dto.SalesReportDtos;
import com.fawnix.sales.reports.service.SalesReportService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sales/reports")
public class SalesReportController {

  private final SalesReportService salesReportService;

  public SalesReportController(SalesReportService salesReportService) {
    this.salesReportService = salesReportService;
  }

  @GetMapping("/overview")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesReportDtos.SalesReportResponse getOverview() {
    return salesReportService.getOverview();
  }
}
