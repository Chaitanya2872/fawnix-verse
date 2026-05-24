package com.fawnix.sales.deliveries.controller;

import com.fawnix.sales.deliveries.dto.SalesDeliveryDtos;
import com.fawnix.sales.deliveries.service.SalesDeliveryService;
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
@RequestMapping("/api/sales/deliveries")
public class SalesDeliveryController {

  private final SalesDeliveryService salesDeliveryService;

  public SalesDeliveryController(SalesDeliveryService salesDeliveryService) {
    this.salesDeliveryService = salesDeliveryService;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesDeliveryDtos.SalesDeliveryListResponse getDeliveries(@RequestParam(required = false) String salesOrderId) {
    return salesDeliveryService.getDeliveries(salesOrderId);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesDeliveryDtos.SalesDeliveryResponse createDelivery(
      @Valid @RequestBody SalesDeliveryDtos.CreateSalesDeliveryRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesDeliveryService.createDelivery(request, userDetails);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesDeliveryDtos.SalesDeliveryResponse updateStatus(
      @PathVariable String id,
      @Valid @RequestBody SalesDeliveryDtos.UpdateSalesDeliveryStatusRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesDeliveryService.updateStatus(id, request, userDetails);
  }
}
