package com.fawnix.procurement.controller;

import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.service.InvoiceService;
import jakarta.validation.Valid;
import java.util.List;
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
@RequestMapping({"/procurement/invoices", "/invoices"})
public class InvoiceController {

  private final InvoiceService invoiceService;

  public InvoiceController(InvoiceService invoiceService) {
    this.invoiceService = invoiceService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProcurementDtos.InvoiceResponse createInvoice(
      @Valid @RequestBody ProcurementDtos.CreateInvoiceRequest request
  ) {
    return invoiceService.createInvoice(request);
  }

  @GetMapping
  public List<ProcurementDtos.InvoiceResponse> getInvoices() {
    return invoiceService.getInvoices();
  }

  @GetMapping("/{id}")
  public ProcurementDtos.InvoiceResponse getInvoice(@PathVariable UUID id) {
    return invoiceService.getInvoice(id);
  }

  @PostMapping("/{id}/approval-actions")
  public ProcurementDtos.InvoiceResponse reviewInvoice(
      @PathVariable UUID id,
      @Valid @RequestBody ProcurementDtos.ApprovalDecisionRequest request
  ) {
    return invoiceService.reviewInvoice(id, request);
  }
}
