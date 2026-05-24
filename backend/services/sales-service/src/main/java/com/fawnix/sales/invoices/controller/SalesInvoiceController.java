package com.fawnix.sales.invoices.controller;

import com.fawnix.sales.invoices.dto.SalesInvoiceDtos;
import com.fawnix.sales.invoices.service.SalesInvoiceService;
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
@RequestMapping("/api/sales/invoices")
public class SalesInvoiceController {

  private final SalesInvoiceService salesInvoiceService;

  public SalesInvoiceController(SalesInvoiceService salesInvoiceService) {
    this.salesInvoiceService = salesInvoiceService;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesInvoiceDtos.SalesInvoiceListResponse getInvoices(@RequestParam(required = false) String salesOrderId) {
    return salesInvoiceService.getInvoices(salesOrderId);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesInvoiceDtos.SalesInvoiceResponse createInvoice(
      @Valid @RequestBody SalesInvoiceDtos.CreateSalesInvoiceRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesInvoiceService.createInvoice(request, userDetails);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesInvoiceDtos.SalesInvoiceResponse updateStatus(
      @PathVariable String id,
      @Valid @RequestBody SalesInvoiceDtos.UpdateSalesInvoiceStatusRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesInvoiceService.updateStatus(id, request, userDetails);
  }
}
