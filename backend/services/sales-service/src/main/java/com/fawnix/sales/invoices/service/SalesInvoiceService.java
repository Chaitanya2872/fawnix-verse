package com.fawnix.sales.invoices.service;

import com.fawnix.sales.common.exception.BadRequestException;
import com.fawnix.sales.common.exception.ResourceNotFoundException;
import com.fawnix.sales.invoices.dto.SalesInvoiceDtos;
import com.fawnix.sales.invoices.entity.SalesInvoiceEntity;
import com.fawnix.sales.invoices.entity.SalesInvoiceStatus;
import com.fawnix.sales.invoices.repository.SalesInvoiceRepository;
import com.fawnix.sales.orders.entity.SalesOrderEntity;
import com.fawnix.sales.orders.repository.SalesOrderRepository;
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
public class SalesInvoiceService {

  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesOrderRepository salesOrderRepository;

  public SalesInvoiceService(
      SalesInvoiceRepository salesInvoiceRepository,
      SalesOrderRepository salesOrderRepository
  ) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesOrderRepository = salesOrderRepository;
  }

  @Transactional(readOnly = true)
  public SalesInvoiceDtos.SalesInvoiceListResponse getInvoices(String salesOrderId) {
    List<SalesInvoiceEntity> invoices = salesOrderId == null || salesOrderId.isBlank()
        ? salesInvoiceRepository.findTop20ByOrderByCreatedAtDesc()
        : salesInvoiceRepository.findTop20BySalesOrderIdOrderByCreatedAtDesc(salesOrderId.trim());
    return new SalesInvoiceDtos.SalesInvoiceListResponse(invoices.stream().map(this::toResponse).toList());
  }

  @Transactional
  public SalesInvoiceDtos.SalesInvoiceResponse createInvoice(
      SalesInvoiceDtos.CreateSalesInvoiceRequest request,
      AppUserDetails userDetails
  ) {
    SalesOrderEntity order = requireOrder(request.salesOrderId());
    SalesInvoiceEntity invoice = new SalesInvoiceEntity();
    invoice.setId(UUID.randomUUID().toString());
    invoice.setInvoiceNumber(generateInvoiceNumber());
    invoice.setSalesOrderId(order.getId());
    invoice.setSalesOrderNumber(order.getOrderNumber());
    invoice.setCustomerName(order.getCustomerName());
    invoice.setCompany(order.getCompany());
    invoice.setBillingAddress(order.getBillingAddress());
    invoice.setCurrency(order.getCurrency());
    invoice.setStatus(SalesInvoiceStatus.DRAFT);
    invoice.setDueDate(request.dueDate() != null ? request.dueDate() : LocalDate.now().plusDays(14));
    invoice.setSubtotal(scaleMoney(order.getSubtotal()));
    invoice.setTaxTotal(scaleMoney(order.getTaxTotal()));
    invoice.setTotal(scaleMoney(order.getTotal()));
    invoice.setBalanceDue(scaleMoney(order.getTotal()));
    invoice.setNotes(trimToNull(request.notes()));
    Instant now = Instant.now();
    invoice.setCreatedAt(now);
    invoice.setUpdatedAt(now);
    applyUser(invoice, userDetails);
    return toResponse(salesInvoiceRepository.save(invoice));
  }

  @Transactional
  public SalesInvoiceDtos.SalesInvoiceResponse updateStatus(
      String id,
      SalesInvoiceDtos.UpdateSalesInvoiceStatusRequest request,
      AppUserDetails userDetails
  ) {
    SalesInvoiceEntity invoice = salesInvoiceRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Sales invoice not found."));
    invoice.setStatus(request.status());
    Instant now = Instant.now();
    if (request.status() == SalesInvoiceStatus.ISSUED && invoice.getIssuedAt() == null) {
      invoice.setIssuedAt(now);
    }
    if (request.status() == SalesInvoiceStatus.PAID) {
      invoice.setIssuedAt(invoice.getIssuedAt() == null ? now : invoice.getIssuedAt());
      invoice.setPaidAt(now);
      invoice.setBalanceDue(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
    } else if (request.status() == SalesInvoiceStatus.PARTIALLY_PAID) {
      if (request.balanceDue() == null) {
        throw new BadRequestException("Balance due is required for partial payments.");
      }
      invoice.setIssuedAt(invoice.getIssuedAt() == null ? now : invoice.getIssuedAt());
      invoice.setBalanceDue(scaleMoney(request.balanceDue()));
    } else if (request.balanceDue() != null) {
      invoice.setBalanceDue(scaleMoney(request.balanceDue()));
    }
    invoice.setUpdatedAt(now);
    if (userDetails != null) {
      invoice.setUpdatedByUserId(userDetails.getUserId());
      invoice.setUpdatedByName(userDetails.getFullName());
    }
    return toResponse(salesInvoiceRepository.save(invoice));
  }

  private SalesInvoiceDtos.SalesInvoiceResponse toResponse(SalesInvoiceEntity invoice) {
    return new SalesInvoiceDtos.SalesInvoiceResponse(
        invoice.getId(),
        invoice.getInvoiceNumber(),
        invoice.getSalesOrderId(),
        invoice.getSalesOrderNumber(),
        invoice.getCustomerName(),
        invoice.getCompany(),
        invoice.getBillingAddress(),
        invoice.getCurrency(),
        invoice.getStatus(),
        invoice.getDueDate(),
        invoice.getIssuedAt(),
        invoice.getPaidAt(),
        invoice.getSubtotal(),
        invoice.getTaxTotal(),
        invoice.getTotal(),
        invoice.getBalanceDue(),
        invoice.getNotes(),
        invoice.getCreatedAt(),
        invoice.getUpdatedAt()
    );
  }

  private SalesOrderEntity requireOrder(String id) {
    return salesOrderRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Sales order not found."));
  }

  private void applyUser(SalesInvoiceEntity invoice, AppUserDetails userDetails) {
    if (userDetails == null) {
      return;
    }
    invoice.setCreatedByUserId(userDetails.getUserId());
    invoice.setCreatedByName(userDetails.getFullName());
    invoice.setUpdatedByUserId(userDetails.getUserId());
    invoice.setUpdatedByName(userDetails.getFullName());
  }

  private String generateInvoiceNumber() {
    String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    for (int i = 0; i < 6; i++) {
      String suffix = String.valueOf((int) (Math.random() * 9000) + 1000);
      String candidate = "INV-" + datePart + "-" + suffix;
      if (!salesInvoiceRepository.existsByInvoiceNumber(candidate)) {
        return candidate;
      }
    }
    return "INV-" + datePart + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT);
  }

  private BigDecimal scaleMoney(BigDecimal value) {
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
