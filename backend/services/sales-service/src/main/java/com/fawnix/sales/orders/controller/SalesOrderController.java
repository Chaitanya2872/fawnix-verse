package com.fawnix.sales.orders.controller;

import com.fawnix.sales.orders.dto.SalesOrderDtos;
import com.fawnix.sales.orders.service.SalesOrderService;
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
@RequestMapping("/api/sales/orders")
public class SalesOrderController {

  private final SalesOrderService salesOrderService;

  public SalesOrderController(SalesOrderService salesOrderService) {
    this.salesOrderService = salesOrderService;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesOrderDtos.SalesOrderListResponse getOrders(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "ALL") String status,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int pageSize
  ) {
    return salesOrderService.getOrders(search, status, page, pageSize);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesOrderDtos.SalesOrderResponse getOrder(@PathVariable String id) {
    return salesOrderService.getOrder(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesOrderDtos.SalesOrderResponse createOrder(
      @Valid @RequestBody SalesOrderDtos.CreateSalesOrderRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesOrderService.createOrder(request, userDetails);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesOrderDtos.SalesOrderResponse updateOrder(
      @PathVariable String id,
      @Valid @RequestBody SalesOrderDtos.UpdateSalesOrderRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesOrderService.updateOrder(id, request, userDetails);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesOrderDtos.SalesOrderResponse updateStatus(
      @PathVariable String id,
      @Valid @RequestBody SalesOrderDtos.UpdateSalesOrderStatusRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesOrderService.updateStatus(id, request, userDetails);
  }

  @PostMapping("/{id}/submit")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesOrderDtos.SalesOrderResponse submitOrder(
      @PathVariable String id,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesOrderService.submitOrder(id, userDetails);
  }

  @PostMapping("/{id}/confirm")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesOrderDtos.SalesOrderResponse confirmOrder(
      @PathVariable String id,
      @Valid @RequestBody SalesOrderDtos.ConfirmSalesOrderRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesOrderService.confirmOrder(id, request, userDetails);
  }

  @PostMapping("/{id}/approval-action")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesOrderDtos.SalesOrderResponse applyApprovalAction(
      @PathVariable String id,
      @Valid @RequestBody SalesOrderDtos.ApprovalActionRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return salesOrderService.applyApprovalAction(id, request, userDetails);
  }

  @GetMapping("/approval-rules")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public java.util.List<SalesOrderDtos.SalesOrderApprovalRuleResponse> getApprovalRules() {
    return salesOrderService.getApprovalRules();
  }

  @PostMapping("/approval-rules")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesOrderDtos.SalesOrderApprovalRuleResponse createApprovalRule(
      @Valid @RequestBody SalesOrderDtos.SalesOrderApprovalRuleRequest request
  ) {
    return salesOrderService.createApprovalRule(request);
  }

  @PatchMapping("/approval-rules/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public SalesOrderDtos.SalesOrderApprovalRuleResponse updateApprovalRule(
      @PathVariable String id,
      @Valid @RequestBody SalesOrderDtos.SalesOrderApprovalRuleRequest request
  ) {
    return salesOrderService.updateApprovalRule(id, request);
  }
}
