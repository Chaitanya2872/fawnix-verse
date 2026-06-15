package com.fawnix.sales.returns.controller;

import com.fawnix.sales.returns.dto.SalesReturnDtos;
import com.fawnix.sales.returns.service.SalesReturnService;
import com.fawnix.sales.security.service.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sales/returns")
public class SalesReturnController {

  private final SalesReturnService salesReturnService;

  public SalesReturnController(SalesReturnService salesReturnService) {
    this.salesReturnService = salesReturnService;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesReturnDtos.SalesReturnListResponse getReturns(@RequestParam(required = false) String salesOrderId) {
    return salesReturnService.getReturns(salesOrderId);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesReturnDtos.SalesReturnResponse createReturn(
      @Valid @RequestBody SalesReturnDtos.CreateSalesReturnRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesReturnService.createReturn(request, userDetails);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesReturnDtos.SalesReturnResponse updateReturnStatus(
      @PathVariable String id,
      @Valid @RequestBody SalesReturnDtos.UpdateSalesReturnStatusRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesReturnService.updateStatus(id, request, userDetails);
  }
}
