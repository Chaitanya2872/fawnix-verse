package com.fawnix.procurement.service;

import com.fawnix.procurement.client.InventoryClient;
import com.fawnix.procurement.client.dto.InventoryProductResponse;
import com.fawnix.procurement.common.exception.BadRequestException;
import com.fawnix.procurement.common.exception.ResourceNotFoundException;
import com.fawnix.procurement.domain.PurchaseOrder;
import com.fawnix.procurement.domain.PurchaseOrderItem;
import com.fawnix.procurement.domain.PurchaseOrderStatus;
import com.fawnix.procurement.domain.PurchaseRequisition;
import com.fawnix.procurement.domain.PurchaseRequisitionItem;
import com.fawnix.procurement.domain.Vendor;
import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.mapper.ProcurementMapper;
import com.fawnix.procurement.repository.PurchaseOrderItemRepository;
import com.fawnix.procurement.repository.PurchaseOrderRepository;
import feign.FeignException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PurchaseOrderService {

  private final PurchaseOrderRepository purchaseOrderRepository;
  private final PurchaseOrderItemRepository purchaseOrderItemRepository;
  private final PurchaseRequisitionService purchaseRequisitionService;
  private final VendorService vendorService;
  private final InventoryClient inventoryClient;
  private final ProcurementMapper procurementMapper;

  public PurchaseOrderService(
      PurchaseOrderRepository purchaseOrderRepository,
      PurchaseOrderItemRepository purchaseOrderItemRepository,
      PurchaseRequisitionService purchaseRequisitionService,
      VendorService vendorService,
      InventoryClient inventoryClient,
      ProcurementMapper procurementMapper
  ) {
    this.purchaseOrderRepository = purchaseOrderRepository;
    this.purchaseOrderItemRepository = purchaseOrderItemRepository;
    this.purchaseRequisitionService = purchaseRequisitionService;
    this.vendorService = vendorService;
    this.inventoryClient = inventoryClient;
    this.procurementMapper = procurementMapper;
  }

  @Transactional
  public ProcurementDtos.PurchaseOrderResponse createPurchaseOrderFromRequisition(
      UUID purchaseRequisitionId,
      ProcurementDtos.CreatePurchaseOrderFromRequisitionRequest request
  ) {
    if (purchaseOrderRepository.findByPurchaseRequisitionId(purchaseRequisitionId).isPresent()) {
      throw new BadRequestException("A purchase order already exists for this requisition.");
    }

    PurchaseRequisition requisition = purchaseRequisitionService.requireApprovedPurchaseRequisition(purchaseRequisitionId);
    Vendor vendor = vendorService.requireVendor(request.vendorId());
    List<PurchaseRequisitionItem> requisitionItems = purchaseRequisitionService.getItems(purchaseRequisitionId);
    if (requisitionItems.isEmpty()) {
      throw new BadRequestException("Approved requisition does not contain any items.");
    }

    PurchaseOrder purchaseOrder = new PurchaseOrder();
    purchaseOrder.setId(UUID.randomUUID());
    purchaseOrder.setPoNumber(generateDocumentNumber("PO"));
    purchaseOrder.setPurchaseRequisition(requisition);
    purchaseOrder.setVendor(vendor);
    purchaseOrder.setOrderDate(request.orderDate());
    purchaseOrder.setExpectedDeliveryDate(request.expectedDeliveryDate());
    purchaseOrder.setStatus(PurchaseOrderStatus.CREATED);
    purchaseOrder.setNotes(trimToNull(request.notes()));

    List<PurchaseOrderItem> poItems = requisitionItems.stream()
        .map(item -> createPurchaseOrderItem(purchaseOrder, item))
        .toList();
    BigDecimal totalAmount = poItems.stream()
        .map(PurchaseOrderItem::getLineTotal)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    purchaseOrder.setTotalAmount(scale(totalAmount));

    PurchaseOrder saved = purchaseOrderRepository.save(purchaseOrder);
    purchaseOrderItemRepository.saveAll(poItems);
    purchaseRequisitionService.markPurchaseOrderCreated(requisition);
    return procurementMapper.toPurchaseOrderResponse(saved, poItems);
  }

  @Transactional(readOnly = true)
  public List<ProcurementDtos.PurchaseOrderResponse> getPurchaseOrders() {
    return purchaseOrderRepository.findAll().stream()
        .map(purchaseOrder -> procurementMapper.toPurchaseOrderResponse(
            purchaseOrder,
            purchaseOrderItemRepository.findByPurchaseOrderId(purchaseOrder.getId())
        ))
        .toList();
  }

  @Transactional(readOnly = true)
  public ProcurementDtos.PurchaseOrderResponse getPurchaseOrder(UUID id) {
    PurchaseOrder purchaseOrder = requirePurchaseOrder(id);
    return procurementMapper.toPurchaseOrderResponse(purchaseOrder, purchaseOrderItemRepository.findByPurchaseOrderId(id));
  }

  public PurchaseOrder requirePurchaseOrder(UUID id) {
    return purchaseOrderRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found."));
  }

  private PurchaseOrderItem createPurchaseOrderItem(PurchaseOrder purchaseOrder, PurchaseRequisitionItem requisitionItem) {
    InventoryProductResponse product = fetchProduct(requisitionItem.getProductId());
    PurchaseOrderItem item = new PurchaseOrderItem();
    item.setId(UUID.randomUUID());
    item.setPurchaseOrder(purchaseOrder);
    item.setProductId(requisitionItem.getProductId());
    item.setSku(product.sku());
    item.setProductName(product.name());
    item.setCategory(product.category());
    item.setUnit(product.unit());
    item.setQuantity(scale(requisitionItem.getQuantity()));
    item.setUnitPrice(scale(product.price() == null ? requisitionItem.getEstimatedUnitPrice() : product.price()));
    item.setLineTotal(scale(item.getQuantity().multiply(item.getUnitPrice())));
    return item;
  }

  private InventoryProductResponse fetchProduct(UUID productId) {
    try {
      return inventoryClient.getProduct(productId);
    } catch (FeignException.NotFound exception) {
      throw new BadRequestException("Product " + productId + " was not found in inventory-service.");
    }
  }

  private String generateDocumentNumber(String prefix) {
    String day = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    return prefix + "-" + day + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
  }

  private BigDecimal scale(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
