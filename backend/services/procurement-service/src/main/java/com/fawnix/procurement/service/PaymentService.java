package com.fawnix.procurement.service;

import com.fawnix.procurement.common.exception.BadRequestException;
import com.fawnix.procurement.common.exception.ResourceNotFoundException;
import com.fawnix.procurement.domain.ApprovalAction;
import com.fawnix.procurement.domain.Invoice;
import com.fawnix.procurement.domain.InvoiceStatus;
import com.fawnix.procurement.domain.Payment;
import com.fawnix.procurement.domain.PaymentStatus;
import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.mapper.ProcurementMapper;
import com.fawnix.procurement.repository.InvoiceRepository;
import com.fawnix.procurement.repository.PaymentRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

  private final PaymentRepository paymentRepository;
  private final InvoiceService invoiceService;
  private final InvoiceRepository invoiceRepository;
  private final ProcurementMapper procurementMapper;

  public PaymentService(
      PaymentRepository paymentRepository,
      InvoiceService invoiceService,
      InvoiceRepository invoiceRepository,
      ProcurementMapper procurementMapper
  ) {
    this.paymentRepository = paymentRepository;
    this.invoiceService = invoiceService;
    this.invoiceRepository = invoiceRepository;
    this.procurementMapper = procurementMapper;
  }

  @Transactional
  public ProcurementDtos.PaymentResponse createPayment(ProcurementDtos.CreatePaymentRequest request) {
    Invoice invoice = invoiceService.requireApprovedInvoice(request.invoiceId());
    if (paymentRepository.existsByInvoiceIdAndStatusIn(
        request.invoiceId(),
        List.of(PaymentStatus.PENDING_APPROVAL, PaymentStatus.PAID)
    )) {
      throw new BadRequestException("A payment request already exists for this invoice.");
    }

    Payment payment = new Payment();
    payment.setId(UUID.randomUUID());
    payment.setPaymentNumber(generateDocumentNumber("PAY"));
    payment.setInvoice(invoice);
    payment.setRequestedBy(request.requestedBy());
    payment.setApprovedBy(null);
    payment.setPaymentDate(request.paymentDate());
    payment.setAmount(invoice.getAmount());
    payment.setStatus(PaymentStatus.PENDING_APPROVAL);
    payment.setRemarks(trimToNull(request.remarks()));
    return procurementMapper.toPaymentResponse(paymentRepository.save(payment));
  }

  @Transactional(readOnly = true)
  public java.util.List<ProcurementDtos.PaymentResponse> getPayments() {
    return paymentRepository.findAll().stream()
        .map(procurementMapper::toPaymentResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public ProcurementDtos.PaymentResponse getPayment(UUID id) {
    return procurementMapper.toPaymentResponse(requirePayment(id));
  }

  @Transactional
  public ProcurementDtos.PaymentResponse reviewPayment(UUID id, ProcurementDtos.ApprovalDecisionRequest request) {
    Payment payment = requirePayment(id);
    if (request.action() == ApprovalAction.SUBMITTED) {
      throw new BadRequestException("Only APPROVED or REJECTED actions are allowed.");
    }
    if (payment.getStatus() != PaymentStatus.PENDING_APPROVAL) {
      throw new BadRequestException("Only pending payment requests can be reviewed.");
    }

    Invoice invoice = payment.getInvoice();
    if (request.action() == ApprovalAction.APPROVED) {
      payment.setStatus(PaymentStatus.PAID);
      payment.setApprovedBy(request.actorId());
      if (payment.getPaymentDate() == null) {
        payment.setPaymentDate(LocalDate.now());
      }
      invoice.setStatus(InvoiceStatus.PAID);
      invoiceRepository.save(invoice);
    } else {
      payment.setStatus(PaymentStatus.REJECTED);
      payment.setApprovedBy(request.actorId());
      invoice.setStatus(InvoiceStatus.APPROVED);
      invoiceRepository.save(invoice);
    }
    payment.setRemarks(trimToNull(request.remarks()) != null ? trimToNull(request.remarks()) : payment.getRemarks());
    return procurementMapper.toPaymentResponse(paymentRepository.save(payment));
  }

  public Payment requirePayment(UUID id) {
    return paymentRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Payment request not found."));
  }

  private String generateDocumentNumber(String prefix) {
    String day = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    return prefix + "-" + day + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
