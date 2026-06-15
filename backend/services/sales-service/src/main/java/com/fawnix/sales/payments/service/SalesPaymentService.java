package com.fawnix.sales.payments.service;

import com.fawnix.sales.common.exception.BadRequestException;
import com.fawnix.sales.common.exception.ResourceNotFoundException;
import com.fawnix.sales.invoices.entity.SalesInvoiceEntity;
import com.fawnix.sales.invoices.entity.SalesInvoiceStatus;
import com.fawnix.sales.invoices.repository.SalesInvoiceRepository;
import com.fawnix.sales.orders.entity.SalesOrderEntity;
import com.fawnix.sales.orders.entity.SalesOrderStatus;
import com.fawnix.sales.orders.repository.SalesOrderRepository;
import com.fawnix.sales.payments.dto.SalesPaymentDtos;
import com.fawnix.sales.payments.entity.SalesPaymentEntity;
import com.fawnix.sales.payments.repository.SalesPaymentRepository;
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
public class SalesPaymentService {

  private final SalesPaymentRepository paymentRepository;
  private final SalesInvoiceRepository invoiceRepository;
  private final SalesOrderRepository orderRepository;

  public SalesPaymentService(
      SalesPaymentRepository paymentRepository,
      SalesInvoiceRepository invoiceRepository,
      SalesOrderRepository orderRepository
  ) {
    this.paymentRepository = paymentRepository;
    this.invoiceRepository = invoiceRepository;
    this.orderRepository = orderRepository;
  }

  @Transactional(readOnly = true)
  public SalesPaymentDtos.SalesPaymentListResponse getPayments(String salesInvoiceId) {
    List<SalesPaymentEntity> payments = salesInvoiceId == null || salesInvoiceId.isBlank()
        ? paymentRepository.findTop50ByOrderByCreatedAtDesc()
        : paymentRepository.findTop50BySalesInvoiceIdOrderByCreatedAtDesc(salesInvoiceId.trim());
    return new SalesPaymentDtos.SalesPaymentListResponse(payments.stream().map(this::toResponse).toList());
  }

  @Transactional
  public SalesPaymentDtos.SalesPaymentResponse createPayment(
      SalesPaymentDtos.CreateSalesPaymentRequest request,
      AppUserDetails userDetails
  ) {
    SalesInvoiceEntity invoice = invoiceRepository.findById(request.salesInvoiceId())
        .orElseThrow(() -> new ResourceNotFoundException("Sales invoice not found."));
    if (invoice.getStatus() == SalesInvoiceStatus.CANCELLED) {
      throw new BadRequestException("Cancelled invoices cannot accept payments.");
    }

    BigDecimal amount = scale(request.amount());
    if (amount.compareTo(invoice.getBalanceDue()) > 0) {
      throw new BadRequestException("Payment exceeds invoice balance due.");
    }

    SalesPaymentEntity payment = new SalesPaymentEntity();
    payment.setId(UUID.randomUUID().toString());
    payment.setPaymentNumber(generatePaymentNumber());
    payment.setSalesInvoiceId(invoice.getId());
    payment.setSalesOrderId(invoice.getSalesOrderId());
    payment.setCustomerName(invoice.getCustomerName());
    payment.setCurrency(invoice.getCurrency());
    payment.setPaymentDate(request.paymentDate());
    payment.setAmount(amount);
    payment.setPaymentMode(request.paymentMode());
    payment.setReferenceNumber(trimToNull(request.referenceNumber()));
    payment.setRemarks(trimToNull(request.remarks()));
    payment.setCreatedByUserId(userDetails != null ? userDetails.getUserId() : null);
    payment.setCreatedByName(userDetails != null ? userDetails.getFullName() : null);
    payment.setCreatedAt(Instant.now());

    BigDecimal newBalance = scale(invoice.getBalanceDue().subtract(amount));
    invoice.setBalanceDue(newBalance);
    invoice.setIssuedAt(invoice.getIssuedAt() == null ? Instant.now() : invoice.getIssuedAt());
    if (newBalance.compareTo(BigDecimal.ZERO) == 0) {
      invoice.setStatus(SalesInvoiceStatus.PAID);
      invoice.setPaidAt(Instant.now());
    } else {
      invoice.setStatus(SalesInvoiceStatus.PARTIALLY_PAID);
    }
    invoice.setUpdatedAt(Instant.now());
    invoiceRepository.save(invoice);

    SalesOrderEntity order = orderRepository.findById(invoice.getSalesOrderId())
        .orElseThrow(() -> new ResourceNotFoundException("Sales order not found."));
    order.setStatus(newBalance.compareTo(BigDecimal.ZERO) == 0 ? SalesOrderStatus.PAID : SalesOrderStatus.PARTIALLY_PAID);
    order.setUpdatedAt(Instant.now());
    orderRepository.save(order);

    return toResponse(paymentRepository.save(payment));
  }

  private SalesPaymentDtos.SalesPaymentResponse toResponse(SalesPaymentEntity payment) {
    return new SalesPaymentDtos.SalesPaymentResponse(
        payment.getId(),
        payment.getPaymentNumber(),
        payment.getSalesInvoiceId(),
        payment.getSalesOrderId(),
        payment.getCustomerName(),
        payment.getCurrency(),
        payment.getPaymentMode(),
        payment.getPaymentDate(),
        payment.getAmount(),
        payment.getReferenceNumber(),
        payment.getRemarks(),
        payment.getCreatedAt()
    );
  }

  private String generatePaymentNumber() {
    String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    for (int i = 0; i < 6; i++) {
      String suffix = String.valueOf((int) (Math.random() * 9000) + 1000);
      String candidate = "PAY-" + datePart + "-" + suffix;
      if (!paymentRepository.existsByPaymentNumber(candidate)) {
        return candidate;
      }
    }
    return "PAY-" + datePart + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT);
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
