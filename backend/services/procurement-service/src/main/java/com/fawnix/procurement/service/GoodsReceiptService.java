package com.fawnix.procurement.service;

import com.fawnix.procurement.common.exception.BadRequestException;
import com.fawnix.procurement.common.exception.ResourceNotFoundException;
import com.fawnix.procurement.domain.GoodsReceipt;
import com.fawnix.procurement.domain.GoodsReceiptStatus;
import com.fawnix.procurement.domain.PurchaseOrder;
import com.fawnix.procurement.domain.PurchaseOrderStatus;
import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.mapper.ProcurementMapper;
import com.fawnix.procurement.repository.GoodsReceiptRepository;
import com.fawnix.procurement.repository.PurchaseOrderRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoodsReceiptService {

  private final GoodsReceiptRepository goodsReceiptRepository;
  private final PurchaseOrderRepository purchaseOrderRepository;
  private final PurchaseOrderService purchaseOrderService;
  private final ProcurementMapper procurementMapper;

  public GoodsReceiptService(
      GoodsReceiptRepository goodsReceiptRepository,
      PurchaseOrderRepository purchaseOrderRepository,
      PurchaseOrderService purchaseOrderService,
      ProcurementMapper procurementMapper
  ) {
    this.goodsReceiptRepository = goodsReceiptRepository;
    this.purchaseOrderRepository = purchaseOrderRepository;
    this.purchaseOrderService = purchaseOrderService;
    this.procurementMapper = procurementMapper;
  }

  @Transactional
  public ProcurementDtos.GoodsReceiptResponse createGoodsReceipt(ProcurementDtos.CreateGoodsReceiptRequest request) {
    PurchaseOrder purchaseOrder = purchaseOrderService.requirePurchaseOrder(request.purchaseOrderId());
    if (purchaseOrder.getStatus() != PurchaseOrderStatus.CREATED) {
      throw new BadRequestException("Goods receipt can only be created for a CREATED purchase order.");
    }
    if (goodsReceiptRepository.existsByPurchaseOrderId(request.purchaseOrderId())) {
      throw new BadRequestException("Goods receipt already exists for this purchase order.");
    }

    GoodsReceipt receipt = new GoodsReceipt();
    receipt.setId(UUID.randomUUID());
    receipt.setGrnNumber(generateDocumentNumber("GRN"));
    receipt.setPurchaseOrder(purchaseOrder);
    receipt.setReceiptDate(request.receiptDate());
    receipt.setReceivedBy(request.receivedBy());
    receipt.setStatus(GoodsReceiptStatus.RECEIVED);
    receipt.setRemarks(trimToNull(request.remarks()));
    GoodsReceipt saved = goodsReceiptRepository.save(receipt);

    purchaseOrder.setStatus(PurchaseOrderStatus.RECEIVED);
    purchaseOrderRepository.save(purchaseOrder);
    return procurementMapper.toGoodsReceiptResponse(saved);
  }

  @Transactional(readOnly = true)
  public java.util.List<ProcurementDtos.GoodsReceiptResponse> getGoodsReceipts() {
    return goodsReceiptRepository.findAll().stream()
        .map(procurementMapper::toGoodsReceiptResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public ProcurementDtos.GoodsReceiptResponse getGoodsReceipt(UUID id) {
    GoodsReceipt receipt = goodsReceiptRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Goods receipt not found."));
    return procurementMapper.toGoodsReceiptResponse(receipt);
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
