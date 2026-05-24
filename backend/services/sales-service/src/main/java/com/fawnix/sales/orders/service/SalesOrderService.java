package com.fawnix.sales.orders.service;

import com.fawnix.sales.common.exception.BadRequestException;
import com.fawnix.sales.common.exception.ResourceNotFoundException;
import com.fawnix.sales.integration.inventory.InventoryReservationClient;
import com.fawnix.sales.orders.dto.SalesOrderDtos;
import com.fawnix.sales.orders.entity.SalesOrderEntity;
import com.fawnix.sales.orders.entity.SalesOrderItemEntity;
import com.fawnix.sales.orders.entity.SalesOrderStatus;
import com.fawnix.sales.orders.repository.SalesOrderRepository;
import com.fawnix.sales.orders.specification.SalesOrderSpecifications;
import com.fawnix.sales.quotes.entity.QuoteEntity;
import com.fawnix.sales.quotes.entity.QuoteLineItemEntity;
import com.fawnix.sales.quotes.entity.QuoteStatus;
import com.fawnix.sales.quotes.repository.QuoteRepository;
import com.fawnix.sales.security.service.AppUserDetails;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesOrderService {

  private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

  private final SalesOrderRepository salesOrderRepository;
  private final QuoteRepository quoteRepository;
  private final InventoryReservationClient inventoryReservationClient;

  public SalesOrderService(
      SalesOrderRepository salesOrderRepository,
      QuoteRepository quoteRepository,
      InventoryReservationClient inventoryReservationClient
  ) {
    this.salesOrderRepository = salesOrderRepository;
    this.quoteRepository = quoteRepository;
    this.inventoryReservationClient = inventoryReservationClient;
  }

  @Transactional(readOnly = true)
  public SalesOrderDtos.SalesOrderListResponse getOrders(String search, String status, int page, int pageSize) {
    int safePage = Math.max(page, 1);
    int safePageSize = Math.min(Math.max(pageSize, 1), 200);
    SalesOrderStatus parsedStatus = parseStatus(status);
    Specification<SalesOrderEntity> specification = Specification
        .where(SalesOrderSpecifications.withSearch(search))
        .and(SalesOrderSpecifications.withStatus(parsedStatus));

    Page<SalesOrderEntity> orderPage = salesOrderRepository.findAll(
        specification,
        PageRequest.of(safePage - 1, safePageSize, Sort.by(Sort.Direction.DESC, "createdAt"))
    );

    List<SalesOrderDtos.SalesOrderSummary> summaries = orderPage.getContent().stream()
        .map(this::toSummary)
        .toList();

    return new SalesOrderDtos.SalesOrderListResponse(
        summaries,
        orderPage.getTotalElements(),
        safePage,
        safePageSize,
        orderPage.getTotalPages()
    );
  }

  @Transactional(readOnly = true)
  public SalesOrderDtos.SalesOrderResponse getOrder(String id) {
    return toResponse(requireOrder(id));
  }

  @Transactional
  public SalesOrderDtos.SalesOrderResponse createOrder(
      SalesOrderDtos.CreateSalesOrderRequest request,
      AppUserDetails userDetails
  ) {
    SalesOrderEntity order = new SalesOrderEntity();
    order.setId(UUID.randomUUID().toString());
    order.setOrderNumber(generateOrderNumber());
    applyCreateFields(order, request);
    replaceItems(order, request.items());
    calculateTotals(order);
    Instant now = Instant.now();
    order.setCreatedAt(now);
    order.setUpdatedAt(now);
    if (userDetails != null) {
      order.setCreatedByUserId(userDetails.getUserId());
      order.setCreatedByName(userDetails.getFullName());
      order.setUpdatedByUserId(userDetails.getUserId());
      order.setUpdatedByName(userDetails.getFullName());
    }
    return toResponse(salesOrderRepository.save(order));
  }

  @Transactional
  public SalesOrderDtos.SalesOrderResponse updateOrder(
      String id,
      SalesOrderDtos.UpdateSalesOrderRequest request,
      AppUserDetails userDetails
  ) {
    SalesOrderEntity order = requireOrder(id);
    applyUpdateFields(order, request);
    if (request.items() != null) {
      replaceItems(order, request.items());
    }
    calculateTotals(order);
    touch(order, userDetails);
    return toResponse(salesOrderRepository.save(order));
  }

  @Transactional
  public SalesOrderDtos.SalesOrderResponse updateStatus(
      String id,
      SalesOrderDtos.UpdateSalesOrderStatusRequest request,
      AppUserDetails userDetails
  ) {
    SalesOrderEntity order = requireOrder(id);
    order.setStatus(request.status());
    if (request.status() == SalesOrderStatus.APPROVED && !order.isInventoryReserved()) {
      reserveInventory(order);
    }
    touch(order, userDetails);
    return toResponse(salesOrderRepository.save(order));
  }

  @Transactional
  public SalesOrderDtos.SalesOrderResponse convertQuoteToOrder(String quoteId, AppUserDetails userDetails) {
    SalesOrderEntity existing = salesOrderRepository.findByQuoteId(quoteId).orElse(null);
    if (existing != null) {
      return toResponse(existing);
    }

    QuoteEntity quote = quoteRepository.findById(quoteId)
        .orElseThrow(() -> new ResourceNotFoundException("Quote not found."));

    if (quote.getStatus() != QuoteStatus.ACCEPTED && quote.getStatus() != QuoteStatus.SENT) {
      throw new BadRequestException("Only sent or accepted quotes can be converted to orders.");
    }

    SalesOrderEntity order = new SalesOrderEntity();
    order.setId(UUID.randomUUID().toString());
    order.setOrderNumber(generateOrderNumber());
    order.setQuoteId(quote.getId());
    order.setLeadId(quote.getLeadId());
    order.setCustomerName(quote.getCustomerName());
    order.setCompany(quote.getCompany());
    order.setEmail(quote.getEmail());
    order.setPhone(quote.getPhone());
    order.setBillingAddress(quote.getBillingAddress());
    order.setShippingAddress(quote.getShippingAddress());
    order.setCurrency(normalizeCurrency(quote.getCurrency()));
    order.setStatus(SalesOrderStatus.DRAFT);
    order.setTaxRate(scaleRate(quote.getTaxRate()));
    order.setNotes(trimToNull(quote.getNotes()));
    order.setInventoryReserved(false);

    int position = 1;
    for (QuoteLineItemEntity item : quote.getItems().stream().sorted(Comparator.comparingInt(QuoteLineItemEntity::getPosition)).toList()) {
      SalesOrderItemEntity line = new SalesOrderItemEntity();
      line.setId(UUID.randomUUID().toString());
      line.setSalesOrder(order);
      line.setPosition(position++);
      line.setInventoryProductId(trimToNull(item.getInventoryProductId()));
      line.setName(item.getName());
      line.setMake(trimToNull(item.getMake()));
      line.setDescription(trimToNull(item.getDescription()));
      line.setUtility(trimToNull(item.getUtility()));
      line.setQuantity(scaleQuantity(item.getQuantity()));
      line.setUnit(trimToNull(item.getUnit()));
      line.setUnitPrice(scaleMoney(item.getUnitPrice()));
      line.setLineTotal(scaleMoney(item.getLineTotal()));
      order.getItems().add(line);
    }

    calculateTotals(order);
    Instant now = Instant.now();
    order.setCreatedAt(now);
    order.setUpdatedAt(now);
    if (userDetails != null) {
      order.setCreatedByUserId(userDetails.getUserId());
      order.setCreatedByName(userDetails.getFullName());
      order.setUpdatedByUserId(userDetails.getUserId());
      order.setUpdatedByName(userDetails.getFullName());
    }

    return toResponse(salesOrderRepository.save(order));
  }

  private void applyCreateFields(SalesOrderEntity order, SalesOrderDtos.CreateSalesOrderRequest request) {
    order.setQuoteId(trimToNull(request.quoteId()));
    order.setLeadId(trimToNull(request.leadId()));
    order.setCustomerName(requiredTrimmed(request.customerName(), "Customer name is required."));
    order.setCompany(trimToNull(request.company()));
    order.setEmail(trimToNull(request.email()));
    order.setPhone(trimToNull(request.phone()));
    order.setBillingAddress(trimToNull(request.billingAddress()));
    order.setShippingAddress(trimToNull(request.shippingAddress()));
    order.setCurrency(normalizeCurrency(request.currency()));
    order.setStatus(request.status() != null ? request.status() : SalesOrderStatus.DRAFT);
    order.setTaxRate(scaleRate(request.taxRate()));
    order.setNotes(trimToNull(request.notes()));
  }

  private void applyUpdateFields(SalesOrderEntity order, SalesOrderDtos.UpdateSalesOrderRequest request) {
    if (request.customerName() != null) {
      order.setCustomerName(requiredTrimmed(request.customerName(), "Customer name is required."));
    }
    order.setCompany(trimToNull(request.company()));
    order.setEmail(trimToNull(request.email()));
    order.setPhone(trimToNull(request.phone()));
    order.setBillingAddress(trimToNull(request.billingAddress()));
    order.setShippingAddress(trimToNull(request.shippingAddress()));
    if (request.currency() != null) {
      order.setCurrency(normalizeCurrency(request.currency()));
    }
    if (request.taxRate() != null) {
      order.setTaxRate(scaleRate(request.taxRate()));
    }
    order.setNotes(trimToNull(request.notes()));
  }

  private void replaceItems(SalesOrderEntity order, List<SalesOrderDtos.SalesOrderItemRequest> items) {
    if (items == null || items.isEmpty()) {
      throw new BadRequestException("At least one line item is required.");
    }
    order.getItems().clear();
    int position = 1;
    for (SalesOrderDtos.SalesOrderItemRequest item : items) {
      SalesOrderItemEntity line = new SalesOrderItemEntity();
      line.setId(UUID.randomUUID().toString());
      line.setSalesOrder(order);
      line.setPosition(position++);
      line.setInventoryProductId(trimToNull(item.inventoryProductId()));
      line.setName(requiredTrimmed(item.name(), "Item name is required."));
      line.setMake(trimToNull(item.make()));
      line.setDescription(trimToNull(item.description()));
      line.setUtility(trimToNull(item.utility()));
      line.setQuantity(scaleQuantity(item.quantity()));
      line.setUnit(trimToNull(item.unit()));
      line.setUnitPrice(scaleMoney(item.unitPrice()));
      line.setLineTotal(scaleMoney(item.quantity().multiply(item.unitPrice())));
      order.getItems().add(line);
    }
    order.getItems().sort(Comparator.comparingInt(SalesOrderItemEntity::getPosition));
  }

  private void calculateTotals(SalesOrderEntity order) {
    BigDecimal subtotal = order.getItems().stream()
        .map(SalesOrderItemEntity::getLineTotal)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal taxable = subtotal.max(BigDecimal.ZERO);
    BigDecimal taxRate = defaultMoney(order.getTaxRate());
    BigDecimal taxTotal = BigDecimal.ZERO;
    if (taxRate.compareTo(BigDecimal.ZERO) > 0) {
      taxTotal = taxable.multiply(taxRate).divide(ONE_HUNDRED, 4, RoundingMode.HALF_UP);
    }

    order.setSubtotal(scaleMoney(subtotal));
    order.setTaxRate(scaleRate(order.getTaxRate()));
    order.setTaxTotal(scaleMoney(taxTotal));
    order.setTotal(scaleMoney(taxable.add(taxTotal)));
  }

  private void touch(SalesOrderEntity order, AppUserDetails userDetails) {
    order.setUpdatedAt(Instant.now());
    if (userDetails != null) {
      order.setUpdatedByUserId(userDetails.getUserId());
      order.setUpdatedByName(userDetails.getFullName());
    }
  }

  private void reserveInventory(SalesOrderEntity order) {
    List<InventoryReservationClient.ReserveInventoryLineRequest> reservableItems = order.getItems().stream()
        .filter(item -> item.getInventoryProductId() != null && !item.getInventoryProductId().isBlank())
        .map(item -> new InventoryReservationClient.ReserveInventoryLineRequest(
            item.getInventoryProductId(),
            item.getQuantity(),
            item.getName()
        ))
        .toList();

    if (reservableItems.isEmpty()) {
      order.setInventoryReserved(false);
      order.setInventoryReservationMessage("No inventory-linked items were available to reserve.");
      order.setInventoryReservedAt(null);
      return;
    }

    InventoryReservationClient.ReserveInventoryResponse response =
        inventoryReservationClient.reserve(order.getId(), reservableItems);
    if (response == null || !response.reserved()) {
      throw new BadRequestException("Inventory reservation failed.");
    }

    order.setInventoryReserved(true);
    order.setInventoryReservationMessage(response.message());
    order.setInventoryReservedAt(Instant.now());
  }

  private SalesOrderDtos.SalesOrderResponse toResponse(SalesOrderEntity order) {
    List<SalesOrderDtos.SalesOrderItemResponse> items = order.getItems().stream()
        .sorted(Comparator.comparingInt(SalesOrderItemEntity::getPosition))
        .map(item -> new SalesOrderDtos.SalesOrderItemResponse(
            item.getId(),
            item.getInventoryProductId(),
            item.getName(),
            item.getMake(),
            item.getDescription(),
            item.getUtility(),
            item.getQuantity(),
            item.getUnit(),
            item.getUnitPrice(),
            item.getLineTotal()
        ))
        .toList();

    return new SalesOrderDtos.SalesOrderResponse(
        order.getId(),
        order.getOrderNumber(),
        order.getQuoteId(),
        order.getLeadId(),
        order.getStatus(),
        order.getCustomerName(),
        order.getCompany(),
        order.getEmail(),
        order.getPhone(),
        order.getBillingAddress(),
        order.getShippingAddress(),
        order.getCurrency(),
        order.getSubtotal(),
        order.getTaxRate(),
        order.getTaxTotal(),
        order.getTotal(),
        order.isInventoryReserved(),
        order.getInventoryReservationMessage(),
        order.getInventoryReservedAt(),
        order.getNotes(),
        items,
        order.getCreatedAt(),
        order.getUpdatedAt()
    );
  }

  private SalesOrderDtos.SalesOrderSummary toSummary(SalesOrderEntity order) {
    return new SalesOrderDtos.SalesOrderSummary(
        order.getId(),
        order.getOrderNumber(),
        order.getQuoteId(),
        order.getStatus(),
        order.getCustomerName(),
        order.getCompany(),
        order.getTotal(),
        order.isInventoryReserved(),
        order.getCreatedAt(),
        order.getUpdatedAt()
    );
  }

  private SalesOrderEntity requireOrder(String id) {
    return salesOrderRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Sales order not found."));
  }

  private SalesOrderStatus parseStatus(String value) {
    if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value)) {
      return null;
    }
    try {
      return SalesOrderStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw new BadRequestException("Invalid status.");
    }
  }

  private String generateOrderNumber() {
    String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    for (int i = 0; i < 6; i++) {
      String suffix = String.valueOf((int) (Math.random() * 9000) + 1000);
      String candidate = "SO-" + datePart + "-" + suffix;
      if (!salesOrderRepository.existsByOrderNumber(candidate)) {
        return candidate;
      }
    }
    return "SO-" + datePart + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT);
  }

  private String normalizeCurrency(String currency) {
    if (currency == null || currency.isBlank()) {
      return "INR";
    }
    return currency.trim().toUpperCase(Locale.ROOT);
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private String requiredTrimmed(String value, String message) {
    String trimmed = trimToNull(value);
    if (trimmed == null) {
      throw new BadRequestException(message);
    }
    return trimmed;
  }

  private BigDecimal defaultMoney(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private BigDecimal scaleMoney(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal scaleRate(BigDecimal value) {
    if (value == null || value.compareTo(BigDecimal.ZERO) < 0) {
      return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal scaleQuantity(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }
}
