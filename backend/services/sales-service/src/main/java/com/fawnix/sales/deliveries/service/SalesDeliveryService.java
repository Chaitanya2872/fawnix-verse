package com.fawnix.sales.deliveries.service;

import com.fawnix.sales.common.exception.ResourceNotFoundException;
import com.fawnix.sales.integration.inventory.InventoryReservationClient;
import com.fawnix.sales.deliveries.dto.SalesDeliveryDtos;
import com.fawnix.sales.deliveries.entity.SalesDeliveryEntity;
import com.fawnix.sales.deliveries.entity.SalesDeliveryStatus;
import com.fawnix.sales.deliveries.repository.SalesDeliveryRepository;
import com.fawnix.sales.orders.entity.SalesOrderEntity;
import com.fawnix.sales.orders.entity.SalesOrderItemEntity;
import com.fawnix.sales.orders.entity.SalesOrderStatus;
import com.fawnix.sales.orders.repository.SalesOrderRepository;
import com.fawnix.sales.security.service.AppUserDetails;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesDeliveryService {

  private final SalesDeliveryRepository salesDeliveryRepository;
  private final SalesOrderRepository salesOrderRepository;
  private final InventoryReservationClient inventoryReservationClient;

  public SalesDeliveryService(
      SalesDeliveryRepository salesDeliveryRepository,
      SalesOrderRepository salesOrderRepository,
      InventoryReservationClient inventoryReservationClient
  ) {
    this.salesDeliveryRepository = salesDeliveryRepository;
    this.salesOrderRepository = salesOrderRepository;
    this.inventoryReservationClient = inventoryReservationClient;
  }

  @Transactional(readOnly = true)
  public SalesDeliveryDtos.SalesDeliveryListResponse getDeliveries(String salesOrderId) {
    List<SalesDeliveryEntity> deliveries = salesOrderId == null || salesOrderId.isBlank()
        ? salesDeliveryRepository.findTop20ByOrderByCreatedAtDesc()
        : salesDeliveryRepository.findTop20BySalesOrderIdOrderByCreatedAtDesc(salesOrderId.trim());
    return new SalesDeliveryDtos.SalesDeliveryListResponse(deliveries.stream().map(this::toResponse).toList());
  }

  @Transactional
  public SalesDeliveryDtos.SalesDeliveryResponse createDelivery(
      SalesDeliveryDtos.CreateSalesDeliveryRequest request,
      AppUserDetails userDetails
  ) {
    SalesOrderEntity order = requireOrder(request.salesOrderId());
    if (order.getStatus() != SalesOrderStatus.APPROVED && order.getStatus() != SalesOrderStatus.CONFIRMED && order.getStatus() != SalesOrderStatus.PARTIALLY_DELIVERED) {
      throw new com.fawnix.sales.common.exception.BadRequestException("Only approved or confirmed orders can move to delivery.");
    }
    SalesDeliveryEntity delivery = new SalesDeliveryEntity();
    delivery.setId(UUID.randomUUID().toString());
    delivery.setDeliveryNumber(generateDeliveryNumber());
    delivery.setSalesOrderId(order.getId());
    delivery.setSalesOrderNumber(order.getOrderNumber());
    delivery.setCustomerName(order.getCustomerName());
    delivery.setCompany(order.getCompany());
    delivery.setShippingAddress(order.getShippingAddress());
    delivery.setStatus(SalesDeliveryStatus.DRAFT);
    delivery.setScheduledDate(request.scheduledDate());
    delivery.setCarrier(trimToNull(request.carrier()));
    delivery.setTrackingNumber(trimToNull(request.trackingNumber()));
    delivery.setNotes(trimToNull(request.notes()));
    Instant now = Instant.now();
    delivery.setCreatedAt(now);
    delivery.setUpdatedAt(now);
    applyUser(delivery, userDetails);
    return toResponse(salesDeliveryRepository.save(delivery));
  }

  @Transactional
  public SalesDeliveryDtos.SalesDeliveryResponse updateStatus(
      String id,
      SalesDeliveryDtos.UpdateSalesDeliveryStatusRequest request,
      AppUserDetails userDetails
  ) {
    SalesDeliveryEntity delivery = salesDeliveryRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Sales delivery not found."));
    delivery.setStatus(request.status());
    SalesOrderEntity order = requireOrder(delivery.getSalesOrderId());
    Instant now = Instant.now();
    if (request.status() == SalesDeliveryStatus.DISPATCHED && delivery.getDispatchedAt() == null) {
      fulfillInventory(order);
      delivery.setDispatchedAt(now);
      order.setStatus(SalesOrderStatus.PARTIALLY_DELIVERED);
    }
    if (request.status() == SalesDeliveryStatus.DELIVERED) {
      if (delivery.getDispatchedAt() == null) {
        fulfillInventory(order);
        delivery.setDispatchedAt(now);
      }
      delivery.setDeliveredAt(now);
      order.setStatus(SalesOrderStatus.DELIVERED);
    }
    delivery.setUpdatedAt(now);
    order.setUpdatedAt(now);
    salesOrderRepository.save(order);
    if (userDetails != null) {
      delivery.setUpdatedByUserId(userDetails.getUserId());
      delivery.setUpdatedByName(userDetails.getFullName());
    }
    return toResponse(salesDeliveryRepository.save(delivery));
  }

  private SalesDeliveryDtos.SalesDeliveryResponse toResponse(SalesDeliveryEntity delivery) {
    return new SalesDeliveryDtos.SalesDeliveryResponse(
        delivery.getId(),
        delivery.getDeliveryNumber(),
        delivery.getSalesOrderId(),
        delivery.getSalesOrderNumber(),
        delivery.getCustomerName(),
        delivery.getCompany(),
        delivery.getShippingAddress(),
        delivery.getStatus(),
        delivery.getScheduledDate(),
        delivery.getDispatchedAt(),
        delivery.getDeliveredAt(),
        delivery.getCarrier(),
        delivery.getTrackingNumber(),
        delivery.getNotes(),
        delivery.getCreatedAt(),
        delivery.getUpdatedAt()
    );
  }

  private SalesOrderEntity requireOrder(String id) {
    return salesOrderRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Sales order not found."));
  }

  private void fulfillInventory(SalesOrderEntity order) {
    if (!order.isInventoryReserved()) {
      return;
    }
    if (order.getInventoryReservedAt() == null) {
      return;
    }
    if (order.getStatus() == SalesOrderStatus.PARTIALLY_DELIVERED || order.getStatus() == SalesOrderStatus.DELIVERED) {
      return;
    }
    List<InventoryReservationClient.ReserveInventoryLineRequest> items = order.getItems().stream()
        .filter(item -> item.getInventoryProductId() != null && !item.getInventoryProductId().isBlank())
        .map(item -> new InventoryReservationClient.ReserveInventoryLineRequest(
            item.getInventoryProductId(),
            item.getQuantity(),
            item.getName()
        ))
        .toList();
    if (items.isEmpty()) {
      return;
    }
    inventoryReservationClient.fulfill(order.getId(), items);
    order.setInventoryReserved(false);
    order.setInventoryReservationMessage("Reserved inventory fulfilled through delivery dispatch.");
  }

  private void applyUser(SalesDeliveryEntity delivery, AppUserDetails userDetails) {
    if (userDetails == null) {
      return;
    }
    delivery.setCreatedByUserId(userDetails.getUserId());
    delivery.setCreatedByName(userDetails.getFullName());
    delivery.setUpdatedByUserId(userDetails.getUserId());
    delivery.setUpdatedByName(userDetails.getFullName());
  }

  private String generateDeliveryNumber() {
    String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    for (int i = 0; i < 6; i++) {
      String suffix = String.valueOf((int) (Math.random() * 9000) + 1000);
      String candidate = "DEL-" + datePart + "-" + suffix;
      if (!salesDeliveryRepository.existsByDeliveryNumber(candidate)) {
        return candidate;
      }
    }
    return "DEL-" + datePart + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT);
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
