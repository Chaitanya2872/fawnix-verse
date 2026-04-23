package com.fawnix.procurement.controller;

import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.service.PurchaseRequisitionService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/procurement/requisitions", "/requisitions"})
public class PurchaseRequisitionController {

  private final PurchaseRequisitionService purchaseRequisitionService;

  public PurchaseRequisitionController(PurchaseRequisitionService purchaseRequisitionService) {
    this.purchaseRequisitionService = purchaseRequisitionService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProcurementDtos.PurchaseRequisitionResponse createPurchaseRequisition(
      @Valid @RequestBody ProcurementDtos.CreatePurchaseRequisitionRequest request
  ) {
    return purchaseRequisitionService.createPurchaseRequisition(request);
  }

  @GetMapping
  public java.util.List<ProcurementDtos.PurchaseRequisitionResponse> getPurchaseRequisitions() {
    return purchaseRequisitionService.getPurchaseRequisitions();
  }

  @GetMapping("/{id}")
  public ProcurementDtos.PurchaseRequisitionResponse getPurchaseRequisition(@PathVariable UUID id) {
    return purchaseRequisitionService.getPurchaseRequisition(id);
  }

  @PostMapping("/{id}/submit")
  public ProcurementDtos.PurchaseRequisitionResponse submitPurchaseRequisition(
      @PathVariable UUID id,
      @RequestParam UUID actorId
  ) {
    return purchaseRequisitionService.submitPurchaseRequisition(id, actorId);
  }

  @PostMapping("/{id}/approval-actions")
  public ProcurementDtos.PurchaseRequisitionResponse reviewPurchaseRequisition(
      @PathVariable UUID id,
      @Valid @RequestBody ProcurementDtos.ApprovalDecisionRequest request
  ) {
    return purchaseRequisitionService.reviewPurchaseRequisition(id, request);
  }

  @PostMapping("/{id}/evaluation")
  public ProcurementDtos.PurchaseRequisitionResponse updatePurchaseRequisitionEvaluation(
      @PathVariable UUID id,
      @Valid @RequestBody ProcurementDtos.UpdatePurchaseRequisitionEvaluationRequest request
  ) {
    return purchaseRequisitionService.updatePurchaseRequisitionEvaluation(id, request);
  }

  @PostMapping("/{id}/negotiation")
  public ProcurementDtos.PurchaseRequisitionResponse updatePurchaseRequisitionNegotiation(
      @PathVariable UUID id,
      @Valid @RequestBody ProcurementDtos.UpdatePurchaseRequisitionNegotiationRequest request
  ) {
    return purchaseRequisitionService.updatePurchaseRequisitionNegotiation(id, request);
  }
}
