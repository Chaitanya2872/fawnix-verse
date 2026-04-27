package com.fawnix.procurement.controller;

import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.service.PurchaseRequisitionService.PurchaseRequisitionDocumentContent;
import com.fawnix.procurement.domain.PurchaseRequisitionDocumentType;
import com.fawnix.procurement.service.PurchaseRequisitionService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

  @PutMapping("/{id}")
  public ProcurementDtos.PurchaseRequisitionResponse updatePurchaseRequisition(
      @PathVariable UUID id,
      @Valid @RequestBody ProcurementDtos.UpdatePurchaseRequisitionRequest request
  ) {
    return purchaseRequisitionService.updatePurchaseRequisition(id, request);
  }

  @GetMapping
  public java.util.List<ProcurementDtos.PurchaseRequisitionResponse> getPurchaseRequisitions() {
    return purchaseRequisitionService.getPurchaseRequisitions();
  }

  @GetMapping("/{id}")
  public ProcurementDtos.PurchaseRequisitionResponse getPurchaseRequisition(@PathVariable UUID id) {
    return purchaseRequisitionService.getPurchaseRequisition(id);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deletePurchaseRequisition(@PathVariable UUID id) {
    purchaseRequisitionService.deletePurchaseRequisition(id);
  }

  @GetMapping("/{id}/documents")
  public java.util.List<ProcurementDtos.PurchaseRequisitionDocumentResponse> getPurchaseRequisitionDocuments(@PathVariable UUID id) {
    return purchaseRequisitionService.getPurchaseRequisitionDocuments(id);
  }

  @PostMapping(path = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public ProcurementDtos.PurchaseRequisitionDocumentResponse uploadPurchaseRequisitionDocument(
      @PathVariable UUID id,
      @RequestParam PurchaseRequisitionDocumentType type,
      @RequestPart("file") MultipartFile file
  ) {
    return purchaseRequisitionService.uploadPurchaseRequisitionDocument(id, type, file);
  }

  @GetMapping("/{requisitionId}/documents/{documentId}/content")
  public ResponseEntity<ByteArrayResource> getPurchaseRequisitionDocumentContent(
      @PathVariable UUID requisitionId,
      @PathVariable UUID documentId
  ) {
    PurchaseRequisitionDocumentContent content =
        purchaseRequisitionService.getPurchaseRequisitionDocumentContent(requisitionId, documentId);
    return ResponseEntity.ok()
        .contentType(content.mediaType())
        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + content.fileName() + "\"")
        .body(new ByteArrayResource(content.content()));
  }

  @DeleteMapping("/{requisitionId}/documents/{documentId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deletePurchaseRequisitionDocument(
      @PathVariable UUID requisitionId,
      @PathVariable UUID documentId
  ) {
    purchaseRequisitionService.deletePurchaseRequisitionDocument(requisitionId, documentId);
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

  @PostMapping("/{id}/budget")
  public ProcurementDtos.PurchaseRequisitionResponse updatePurchaseRequisitionBudget(
      @PathVariable UUID id,
      @Valid @RequestBody ProcurementDtos.UpdatePurchaseRequisitionBudgetRequest request
  ) {
    return purchaseRequisitionService.updatePurchaseRequisitionBudget(id, request);
  }

  @PostMapping("/{id}/negotiation")
  public ProcurementDtos.PurchaseRequisitionResponse updatePurchaseRequisitionNegotiation(
      @PathVariable UUID id,
      @Valid @RequestBody ProcurementDtos.UpdatePurchaseRequisitionNegotiationRequest request
  ) {
    return purchaseRequisitionService.updatePurchaseRequisitionNegotiation(id, request);
  }
}
