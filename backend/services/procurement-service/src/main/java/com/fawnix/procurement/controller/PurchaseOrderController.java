package com.fawnix.procurement.controller;

import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.service.PurchaseOrderService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/procurement/purchase-orders")
public class PurchaseOrderController {

  private final PurchaseOrderService purchaseOrderService;

  public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
    this.purchaseOrderService = purchaseOrderService;
  }

  @PostMapping("/from-requisition/{purchaseRequisitionId}")
  @ResponseStatus(HttpStatus.CREATED)
  public ProcurementDtos.PurchaseOrderResponse createPurchaseOrderFromRequisition(
      @PathVariable UUID purchaseRequisitionId,
      @Valid @RequestBody ProcurementDtos.CreatePurchaseOrderFromRequisitionRequest request
  ) {
    return purchaseOrderService.createPurchaseOrderFromRequisition(purchaseRequisitionId, request);
  }

  @GetMapping
  public java.util.List<ProcurementDtos.PurchaseOrderResponse> getPurchaseOrders() {
    return purchaseOrderService.getPurchaseOrders();
  }

  @GetMapping("/{id}")
  public ProcurementDtos.PurchaseOrderResponse getPurchaseOrder(@PathVariable UUID id) {
    return purchaseOrderService.getPurchaseOrder(id);
  }
}
