package com.fawnix.procurement.service;

import com.fawnix.procurement.common.exception.BadRequestException;
import com.fawnix.procurement.common.exception.ResourceNotFoundException;
import com.fawnix.procurement.domain.ApprovalAction;
import com.fawnix.procurement.domain.Invoice;
import com.fawnix.procurement.domain.InvoiceStatus;
import com.fawnix.procurement.domain.PurchaseOrder;
import com.fawnix.procurement.domain.PurchaseOrderStatus;
import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.mapper.ProcurementMapper;
import com.fawnix.procurement.repository.GoodsReceiptRepository;
import com.fawnix.procurement.repository.InvoiceRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvoiceService {

  private final InvoiceRepository invoiceRepository;
  private final PurchaseOrderService purchaseOrderService;
  private final GoodsReceiptRepository goodsReceiptRepository;
  private final ProcurementMapper procurementMapper;

  public InvoiceService(
      InvoiceRepository invoiceRepository,
      PurchaseOrderService purchaseOrderService,
      GoodsReceiptRepository goodsReceiptRepository,
      ProcurementMapper procurementMapper
  ) {
    this.invoiceRepository = invoiceRepository;
    this.purchaseOrderService = purchaseOrderService;
    this.goodsReceiptRepository = goodsReceiptRepository;
    this.procurementMapper = procurementMapper;
  }

  @Transactional
  public ProcurementDtos.InvoiceResponse createInvoice(ProcurementDtos.CreateInvoiceRequest request) {
    PurchaseOrder purchaseOrder = purchaseOrderService.requirePurchaseOrder(request.purchaseOrderId());
    if (purchaseOrder.getStatus() != PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException("Invoice can only be created for a RECEIVED purchase order.");
    }
    invoiceRepository.findByInvoiceNumber(request.invoiceNumber().trim())
        .ifPresent(existing -> {
          throw new BadRequestException("Invoice number already exists.");
        });

    BigDecimal amount = scale(request.amount());
    if (amount.compareTo(scale(purchaseOrder.getTotalAmount())) > 0) {
      throw new BadRequestException("Invoice amount cannot exceed the purchase order total.");
    }

    Invoice invoice = new Invoice();
    invoice.setId(UUID.randomUUID());
    invoice.setInvoiceNumber(request.invoiceNumber().trim());
    invoice.setPurchaseOrder(purchaseOrder);
    invoice.setVendor(purchaseOrder.getVendor());
    invoice.setInvoiceDate(request.invoiceDate());
    invoice.setDueDate(request.dueDate());
    invoice.setAmount(amount);
    invoice.setStatus(InvoiceStatus.PENDING_APPROVAL);
    return toInvoiceResponse(invoiceRepository.save(invoice));
  }

  @Transactional(readOnly = true)
  public java.util.List<ProcurementDtos.InvoiceResponse> getInvoices() {
    return invoiceRepository.findAll().stream()
        .map(this::toInvoiceResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public ProcurementDtos.InvoiceResponse getInvoice(UUID id) {
    return toInvoiceResponse(requireInvoice(id));
  }

  @Transactional
  public ProcurementDtos.InvoiceResponse reviewInvoice(UUID id, ProcurementDtos.ApprovalDecisionRequest request) {
    Invoice invoice = requireInvoice(id);
    if (request.action() == ApprovalAction.SUBMITTED) {
      throw new BadRequestException("Only APPROVED or REJECTED actions are allowed.");
    }
    if (invoice.getStatus() != InvoiceStatus.PENDING_APPROVAL) {
      throw new BadRequestException("Only pending invoices can be reviewed.");
    }

    MatchingResult matching = evaluateMatching(invoice);
    if (request.action() == ApprovalAction.APPROVED && !"MATCHED".equals(matching.status())) {
      throw new BadRequestException("Invoice cannot be approved until PO, GRN, and invoice values are matched.");
    }

    invoice.setStatus(request.action() == ApprovalAction.APPROVED ? InvoiceStatus.APPROVED : InvoiceStatus.REJECTED);
    return toInvoiceResponse(invoiceRepository.save(invoice));
  }

  public Invoice requireApprovedInvoice(UUID id) {
    Invoice invoice = requireInvoice(id);
    if (invoice.getStatus() != InvoiceStatus.APPROVED) {
      throw new BadRequestException("Payment request can be created only for an approved invoice.");
    }
    return invoice;
  }

  public Invoice requireInvoice(UUID id) {
    return invoiceRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Invoice not found."));
  }

  private BigDecimal scale(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private ProcurementDtos.InvoiceResponse toInvoiceResponse(Invoice invoice) {
    MatchingResult matching = evaluateMatching(invoice);
    return procurementMapper.toInvoiceResponse(invoice, matching.status(), matching.notes());
  }

  private MatchingResult evaluateMatching(Invoice invoice) {
    if (!goodsReceiptRepository.existsByPurchaseOrderId(invoice.getPurchaseOrder().getId())) {
      return new MatchingResult("PENDING_GRN", "No goods receipt has been recorded for this purchase order.");
    }

    BigDecimal poTotal = scale(invoice.getPurchaseOrder().getTotalAmount());
    BigDecimal invoiceTotal = scale(invoice.getAmount());
    if (invoiceTotal.compareTo(poTotal) != 0) {
      return new MatchingResult(
          "MISMATCH",
          "Invoice amount does not match the purchase order total. Three-way match failed."
      );
    }

    return new MatchingResult("MATCHED", "PO, GRN, and invoice are aligned for payment processing.");
  }

  private record MatchingResult(String status, String notes) {
  }
}
