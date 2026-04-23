package com.fawnix.procurement.controller;

import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.service.PaymentService;
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
@RequestMapping({"/procurement/payments", "/payments"})
public class PaymentController {

  private final PaymentService paymentService;

  public PaymentController(PaymentService paymentService) {
    this.paymentService = paymentService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProcurementDtos.PaymentResponse createPayment(
      @Valid @RequestBody ProcurementDtos.CreatePaymentRequest request
  ) {
    return paymentService.createPayment(request);
  }

  @GetMapping
  public List<ProcurementDtos.PaymentResponse> getPayments() {
    return paymentService.getPayments();
  }

  @GetMapping("/{id}")
  public ProcurementDtos.PaymentResponse getPayment(@PathVariable UUID id) {
    return paymentService.getPayment(id);
  }

  @PostMapping("/{id}/approval-actions")
  public ProcurementDtos.PaymentResponse reviewPayment(
      @PathVariable UUID id,
      @Valid @RequestBody ProcurementDtos.ApprovalDecisionRequest request
  ) {
    return paymentService.reviewPayment(id, request);
  }
}
