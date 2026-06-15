package com.fawnix.sales.payments.controller;

import com.fawnix.sales.payments.dto.SalesPaymentDtos;
import com.fawnix.sales.payments.service.SalesPaymentService;
import com.fawnix.sales.security.service.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sales/payments")
public class SalesPaymentController {

  private final SalesPaymentService salesPaymentService;

  public SalesPaymentController(SalesPaymentService salesPaymentService) {
    this.salesPaymentService = salesPaymentService;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesPaymentDtos.SalesPaymentListResponse getPayments(@RequestParam(required = false) String salesInvoiceId) {
    return salesPaymentService.getPayments(salesInvoiceId);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesPaymentDtos.SalesPaymentResponse createPayment(
      @Valid @RequestBody SalesPaymentDtos.CreateSalesPaymentRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesPaymentService.createPayment(request, userDetails);
  }
}
