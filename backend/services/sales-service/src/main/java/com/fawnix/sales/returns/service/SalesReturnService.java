package com.fawnix.sales.returns.service;

import com.fawnix.sales.common.exception.ResourceNotFoundException;
import com.fawnix.sales.invoices.entity.SalesInvoiceEntity;
import com.fawnix.sales.invoices.repository.SalesInvoiceRepository;
import com.fawnix.sales.orders.entity.SalesOrderEntity;
import com.fawnix.sales.orders.repository.SalesOrderRepository;
import com.fawnix.sales.returns.dto.SalesReturnDtos;
import com.fawnix.sales.returns.entity.SalesCreditNoteEntity;
import com.fawnix.sales.returns.entity.SalesReturnEntity;
import com.fawnix.sales.returns.entity.SalesReturnStatus;
import com.fawnix.sales.returns.repository.SalesCreditNoteRepository;
import com.fawnix.sales.returns.repository.SalesReturnRepository;
import com.fawnix.sales.security.service.AppUserDetails;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesReturnService {

  private final SalesReturnRepository salesReturnRepository;
  private final SalesCreditNoteRepository creditNoteRepository;
  private final SalesOrderRepository orderRepository;
  private final SalesInvoiceRepository invoiceRepository;

  public SalesReturnService(
      SalesReturnRepository salesReturnRepository,
      SalesCreditNoteRepository creditNoteRepository,
      SalesOrderRepository orderRepository,
      SalesInvoiceRepository invoiceRepository
  ) {
    this.salesReturnRepository = salesReturnRepository;
    this.creditNoteRepository = creditNoteRepository;
    this.orderRepository = orderRepository;
    this.invoiceRepository = invoiceRepository;
  }

  @Transactional(readOnly = true)
  public SalesReturnDtos.SalesReturnListResponse getReturns(String salesOrderId) {
    List<SalesReturnEntity> returns = salesOrderId == null || salesOrderId.isBlank()
        ? salesReturnRepository.findTop50ByOrderByCreatedAtDesc()
        : salesReturnRepository.findTop50BySalesOrderIdOrderByCreatedAtDesc(salesOrderId.trim());
    return new SalesReturnDtos.SalesReturnListResponse(returns.stream().map(this::toResponse).toList());
  }

  @Transactional
  public SalesReturnDtos.SalesReturnResponse createReturn(
      SalesReturnDtos.CreateSalesReturnRequest request,
      AppUserDetails userDetails
  ) {
    SalesOrderEntity order = orderRepository.findById(request.salesOrderId())
        .orElseThrow(() -> new ResourceNotFoundException("Sales order not found."));
    SalesReturnEntity salesReturn = new SalesReturnEntity();
    salesReturn.setId(UUID.randomUUID().toString());
    salesReturn.setReturnNumber(generateReturnNumber());
    salesReturn.setSalesOrderId(order.getId());
    salesReturn.setSalesInvoiceId(trimToNull(request.salesInvoiceId()));
    salesReturn.setCustomerName(order.getCustomerName());
    salesReturn.setStatus(SalesReturnStatus.PENDING_APPROVAL);
    salesReturn.setReturnReason(request.returnReason().trim());
    salesReturn.setRequestedAmount(scale(request.requestedAmount()));
    salesReturn.setApprovedAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
    salesReturn.setRemarks(trimToNull(request.remarks()));
    salesReturn.setCreatedByUserId(userDetails != null ? userDetails.getUserId() : null);
    salesReturn.setCreatedByName(userDetails != null ? userDetails.getFullName() : null);
    salesReturn.setCreatedAt(Instant.now());
    return toResponse(salesReturnRepository.save(salesReturn));
  }

  @Transactional
  public SalesReturnDtos.SalesReturnResponse updateStatus(
      String id,
      SalesReturnDtos.UpdateSalesReturnStatusRequest request,
      AppUserDetails userDetails
  ) {
    SalesReturnEntity salesReturn = salesReturnRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Sales return not found."));
    salesReturn.setStatus(request.status());
    salesReturn.setApprovedAmount(scale(request.approvedAmount() != null ? request.approvedAmount() : salesReturn.getRequestedAmount()));
    salesReturn.setRemarks(trimToNull(request.remarks()));
    if (request.status() == SalesReturnStatus.APPROVED || request.status() == SalesReturnStatus.CREDIT_ISSUED) {
      salesReturn.setApprovedByName(userDetails != null ? userDetails.getFullName() : null);
      salesReturn.setApprovedAt(Instant.now());
      issueCreditNoteIfRequired(salesReturn, userDetails);
    }
    return toResponse(salesReturnRepository.save(salesReturn));
  }

  private void issueCreditNoteIfRequired(SalesReturnEntity salesReturn, AppUserDetails userDetails) {
    if (creditNoteRepository.findBySalesReturnIdOrderByCreatedAtDesc(salesReturn.getId()).isEmpty()) {
      SalesCreditNoteEntity creditNote = new SalesCreditNoteEntity();
      creditNote.setId(UUID.randomUUID().toString());
      creditNote.setCreditNoteNumber(generateCreditNoteNumber());
      creditNote.setSalesReturnId(salesReturn.getId());
      creditNote.setSalesInvoiceId(salesReturn.getSalesInvoiceId());
      creditNote.setCustomerName(salesReturn.getCustomerName());
      creditNote.setCurrency("INR");
      creditNote.setAmount(scale(salesReturn.getApprovedAmount()));
      creditNote.setRemarks("Credit note generated from return approval.");
      creditNote.setCreatedByUserId(userDetails != null ? userDetails.getUserId() : null);
      creditNote.setCreatedByName(userDetails != null ? userDetails.getFullName() : null);
      creditNote.setCreatedAt(Instant.now());
      creditNoteRepository.save(creditNote);

      if (salesReturn.getSalesInvoiceId() != null) {
        SalesInvoiceEntity invoice = invoiceRepository.findById(salesReturn.getSalesInvoiceId()).orElse(null);
        if (invoice != null) {
          invoice.setBalanceDue(scale(invoice.getBalanceDue().subtract(scale(salesReturn.getApprovedAmount())).max(BigDecimal.ZERO)));
          invoice.setUpdatedAt(Instant.now());
          invoiceRepository.save(invoice);
        }
      }
      salesReturn.setStatus(SalesReturnStatus.CREDIT_ISSUED);
    }
  }

  private SalesReturnDtos.SalesReturnResponse toResponse(SalesReturnEntity salesReturn) {
    List<SalesReturnDtos.SalesCreditNoteResponse> notes = creditNoteRepository.findBySalesReturnIdOrderByCreatedAtDesc(salesReturn.getId()).stream()
        .map(note -> new SalesReturnDtos.SalesCreditNoteResponse(
            note.getId(),
            note.getCreditNoteNumber(),
            note.getSalesReturnId(),
            note.getSalesInvoiceId(),
            note.getCustomerName(),
            note.getCurrency(),
            note.getAmount(),
            note.getRemarks(),
            note.getCreatedAt()
        ))
        .toList();
    return new SalesReturnDtos.SalesReturnResponse(
        salesReturn.getId(),
        salesReturn.getReturnNumber(),
        salesReturn.getSalesOrderId(),
        salesReturn.getSalesInvoiceId(),
        salesReturn.getCustomerName(),
        salesReturn.getStatus(),
        salesReturn.getReturnReason(),
        salesReturn.getRequestedAmount(),
        salesReturn.getApprovedAmount(),
        salesReturn.getRemarks(),
        salesReturn.getApprovedByName(),
        salesReturn.getCreatedAt(),
        salesReturn.getApprovedAt(),
        notes
    );
  }

  private String generateReturnNumber() {
    String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    for (int i = 0; i < 6; i++) {
      String suffix = String.valueOf((int) (Math.random() * 9000) + 1000);
      String candidate = "RET-" + datePart + "-" + suffix;
      if (!salesReturnRepository.existsByReturnNumber(candidate)) {
        return candidate;
      }
    }
    return "RET-" + datePart + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT);
  }

  private String generateCreditNoteNumber() {
    String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    for (int i = 0; i < 6; i++) {
      String suffix = String.valueOf((int) (Math.random() * 9000) + 1000);
      String candidate = "CRN-" + datePart + "-" + suffix;
      if (!creditNoteRepository.existsByCreditNoteNumber(candidate)) {
        return candidate;
      }
    }
    return "CRN-" + datePart + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT);
  }

  private BigDecimal scale(BigDecimal value) {
    return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
