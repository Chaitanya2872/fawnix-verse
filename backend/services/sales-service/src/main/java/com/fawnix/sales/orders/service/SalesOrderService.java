package com.fawnix.sales.orders.service;

import com.fawnix.sales.common.exception.BadRequestException;
import com.fawnix.sales.common.exception.ResourceNotFoundException;
import com.fawnix.sales.integration.inventory.InventoryReservationClient;
import com.fawnix.sales.orders.dto.SalesOrderDtos;
import com.fawnix.sales.orders.entity.ApprovalDecisionStatus;
import com.fawnix.sales.orders.entity.SalesOrderApprovalEntity;
import com.fawnix.sales.orders.entity.SalesOrderApprovalRuleEntity;
import com.fawnix.sales.orders.entity.SalesOrderAuditLogEntity;
import com.fawnix.sales.orders.entity.SalesOrderEntity;
import com.fawnix.sales.orders.entity.SalesOrderItemEntity;
import com.fawnix.sales.orders.entity.SalesOrderStatus;
import com.fawnix.sales.orders.repository.SalesOrderApprovalRepository;
import com.fawnix.sales.orders.repository.SalesOrderApprovalRuleRepository;
import com.fawnix.sales.orders.repository.SalesOrderAuditLogRepository;
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
import java.util.ArrayList;
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
  private static final BigDecimal SPECIAL_DISCOUNT_THRESHOLD = new BigDecimal("15");
  private static final int RISKY_PAYMENT_DUE_DAYS = 45;

  private final SalesOrderRepository salesOrderRepository;
  private final SalesOrderApprovalRuleRepository approvalRuleRepository;
  private final SalesOrderApprovalRepository approvalRepository;
  private final SalesOrderAuditLogRepository auditLogRepository;
  private final QuoteRepository quoteRepository;
  private final InventoryReservationClient inventoryReservationClient;

  public SalesOrderService(
      SalesOrderRepository salesOrderRepository,
      SalesOrderApprovalRuleRepository approvalRuleRepository,
      SalesOrderApprovalRepository approvalRepository,
      SalesOrderAuditLogRepository auditLogRepository,
      QuoteRepository quoteRepository,
      InventoryReservationClient inventoryReservationClient
  ) {
    this.salesOrderRepository = salesOrderRepository;
    this.approvalRuleRepository = approvalRuleRepository;
    this.approvalRepository = approvalRepository;
    this.auditLogRepository = auditLogRepository;
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

  @Transactional(readOnly = true)
  public List<SalesOrderDtos.SalesOrderApprovalRuleResponse> getApprovalRules() {
    return approvalRuleRepository.findAll(Sort.by(Sort.Direction.ASC, "sequenceNo")).stream()
        .map(this::toApprovalRuleResponse)
        .toList();
  }

  @Transactional
  public SalesOrderDtos.SalesOrderApprovalRuleResponse createApprovalRule(
      SalesOrderDtos.SalesOrderApprovalRuleRequest request
  ) {
    SalesOrderApprovalRuleEntity entity = new SalesOrderApprovalRuleEntity();
    entity.setId(UUID.randomUUID().toString());
    applyApprovalRule(entity, request);
    Instant now = Instant.now();
    entity.setCreatedAt(now);
    entity.setUpdatedAt(now);
    return toApprovalRuleResponse(approvalRuleRepository.save(entity));
  }

  @Transactional
  public SalesOrderDtos.SalesOrderApprovalRuleResponse updateApprovalRule(
      String id,
      SalesOrderDtos.SalesOrderApprovalRuleRequest request
  ) {
    SalesOrderApprovalRuleEntity entity = approvalRuleRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Approval rule not found."));
    applyApprovalRule(entity, request);
    entity.setUpdatedAt(Instant.now());
    return toApprovalRuleResponse(approvalRuleRepository.save(entity));
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
    validateOrder(order);
    Instant now = Instant.now();
    order.setCreatedAt(now);
    order.setUpdatedAt(now);
    applyUser(order, userDetails);
    SalesOrderEntity saved = salesOrderRepository.save(order);
    logAudit(saved.getId(), "CREATED", userDetails, "Sales order created in status " + saved.getStatus() + ".");
    return toResponse(saved);
  }

  @Transactional
  public SalesOrderDtos.SalesOrderResponse updateOrder(
      String id,
      SalesOrderDtos.UpdateSalesOrderRequest request,
      AppUserDetails userDetails
  ) {
    SalesOrderEntity order = requireOrder(id);
    if (isLocked(order.getStatus())) {
      throw new BadRequestException("Confirmed or closed orders cannot be edited.");
    }
    applyUpdateFields(order, request);
    if (request.items() != null) {
      replaceItems(order, request.items());
    }
    calculateTotals(order);
    validateOrder(order);
    touch(order, userDetails);
    SalesOrderEntity saved = salesOrderRepository.save(order);
    logAudit(saved.getId(), "UPDATED", userDetails, "Sales order details updated.");
    return toResponse(saved);
  }

  @Transactional
  public SalesOrderDtos.SalesOrderResponse updateStatus(
      String id,
      SalesOrderDtos.UpdateSalesOrderStatusRequest request,
      AppUserDetails userDetails
  ) {
    SalesOrderEntity order = requireOrder(id);
    enforceStatusTransition(order.getStatus(), request.status());
    order.setStatus(request.status());
    if (request.status() == SalesOrderStatus.SUBMITTED) {
      handleSubmission(order, userDetails, request.remarks());
    } else if (request.status() == SalesOrderStatus.APPROVED) {
      ensureApprovalReady(order);
      markApproved(order, userDetails, request.remarks());
    } else if (request.status() == SalesOrderStatus.CANCELLED) {
      logAudit(order.getId(), "CANCELLED", userDetails, defaultString(request.remarks(), "Sales order cancelled."));
    }
    touch(order, userDetails);
    return toResponse(salesOrderRepository.save(order));
  }

  @Transactional
  public SalesOrderDtos.SalesOrderResponse submitOrder(String id, AppUserDetails userDetails) {
    SalesOrderEntity order = requireOrder(id);
    if (order.getStatus() != SalesOrderStatus.DRAFT && order.getStatus() != SalesOrderStatus.REJECTED) {
      throw new BadRequestException("Only draft or sent-back orders can be submitted.");
    }
    handleSubmission(order, userDetails, "Order submitted for validation.");
    touch(order, userDetails);
    return toResponse(salesOrderRepository.save(order));
  }

  @Transactional
  public SalesOrderDtos.SalesOrderResponse confirmOrder(
      String id,
      SalesOrderDtos.ConfirmSalesOrderRequest request,
      AppUserDetails userDetails
  ) {
    SalesOrderEntity order = requireOrder(id);
    if (order.getStatus() != SalesOrderStatus.APPROVED && order.getStatus() != SalesOrderStatus.CONFIRMED) {
      throw new BadRequestException("Only approved orders can be confirmed.");
    }
    order.setStatus(SalesOrderStatus.CONFIRMED);
    order.setConfirmedAt(Instant.now());
    order.setConfirmedByName(userDetails != null ? userDetails.getFullName() : null);
    order.setConfirmationAttachmentUrl(trimToNull(request.confirmationAttachmentUrl()));
    touch(order, userDetails);
    logAudit(order.getId(), "CONFIRMED", userDetails, defaultString(request.remarks(), "Order confirmation generated."));
    return toResponse(salesOrderRepository.save(order));
  }

  @Transactional
  public SalesOrderDtos.SalesOrderResponse applyApprovalAction(
      String id,
      SalesOrderDtos.ApprovalActionRequest request,
      AppUserDetails userDetails
  ) {
    SalesOrderEntity order = requireOrder(id);
    String action = request.action().trim().toUpperCase(Locale.ROOT);
    List<SalesOrderApprovalEntity> approvals = approvalRepository.findBySalesOrderIdOrderBySequenceNoAscCreatedAtAsc(order.getId());
    SalesOrderApprovalEntity currentApproval = approvals.stream()
        .filter(item -> item.getStatus() == ApprovalDecisionStatus.PENDING)
        .findFirst()
        .orElse(null);

    switch (action) {
      case "APPROVE" -> {
        if (currentApproval != null) {
          currentApproval.setStatus(ApprovalDecisionStatus.APPROVED);
          currentApproval.setApproverUserId(userDetails != null ? userDetails.getUserId() : null);
          currentApproval.setApproverName(resolveApproverName(userDetails, request.roleLabel()));
          currentApproval.setRemarks(trimToNull(request.remarks()));
          currentApproval.setDecidedAt(Instant.now());
          approvalRepository.save(currentApproval);
        }
        if (approvalRepository.findBySalesOrderIdOrderBySequenceNoAscCreatedAtAsc(order.getId()).stream()
            .noneMatch(item -> item.getStatus() == ApprovalDecisionStatus.PENDING)) {
          markApproved(order, userDetails, request.remarks());
        } else {
          order.setStatus(SalesOrderStatus.PENDING_APPROVAL);
          logAudit(order.getId(), "APPROVAL_PROGRESS", userDetails, defaultString(request.remarks(), "Approval completed for one stage."));
        }
      }
      case "REJECT" -> {
        if (currentApproval != null) {
          currentApproval.setStatus(ApprovalDecisionStatus.REJECTED);
          currentApproval.setApproverUserId(userDetails != null ? userDetails.getUserId() : null);
          currentApproval.setApproverName(resolveApproverName(userDetails, request.roleLabel()));
          currentApproval.setRemarks(trimToNull(request.remarks()));
          currentApproval.setDecidedAt(Instant.now());
          approvalRepository.save(currentApproval);
        }
        order.setStatus(SalesOrderStatus.REJECTED);
        logAudit(order.getId(), "REJECTED", userDetails, defaultString(request.remarks(), "Sales order rejected."));
      }
      case "SEND_BACK" -> {
        if (currentApproval != null) {
          currentApproval.setStatus(ApprovalDecisionStatus.SENT_BACK);
          currentApproval.setApproverUserId(userDetails != null ? userDetails.getUserId() : null);
          currentApproval.setApproverName(resolveApproverName(userDetails, request.roleLabel()));
          currentApproval.setRemarks(trimToNull(request.remarks()));
          currentApproval.setDecidedAt(Instant.now());
          approvalRepository.save(currentApproval);
        }
        order.setStatus(SalesOrderStatus.DRAFT);
        logAudit(order.getId(), "SENT_BACK", userDetails, defaultString(request.remarks(), "Sales order sent back for correction."));
      }
      default -> throw new BadRequestException("Unsupported approval action.");
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
    order.setStockAvailable(false);

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
    validateOrder(order);
    Instant now = Instant.now();
    order.setCreatedAt(now);
    order.setUpdatedAt(now);
    applyUser(order, userDetails);
    SalesOrderEntity saved = salesOrderRepository.save(order);
    logAudit(saved.getId(), "CONVERTED", userDetails, "Converted from quote " + quote.getQuoteNumber() + ".");
    return toResponse(saved);
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
    order.setDeliveryDate(request.deliveryDate());
    order.setPaymentTerms(trimToNull(request.paymentTerms()));
    order.setCustomerPoNumber(trimToNull(request.customerPoNumber()));
    order.setQuotationReference(trimToNull(request.quotationReference()));
    order.setPaymentDueDays(request.paymentDueDays());
    order.setStatus(request.status() != null ? request.status() : SalesOrderStatus.DRAFT);
    order.setTaxRate(scaleRate(request.taxRate()));
    order.setDiscountPercent(scaleRate(request.discountPercent()));
    order.setCustomerCreditLimit(scaleMoney(defaultMoney(request.customerCreditLimit())));
    order.setCustomerOutstandingAmount(scaleMoney(defaultMoney(request.customerOutstandingAmount())));
    order.setConfirmationAttachmentUrl(trimToNull(request.confirmationAttachmentUrl()));
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
    order.setDeliveryDate(request.deliveryDate());
    order.setPaymentTerms(trimToNull(request.paymentTerms()));
    order.setCustomerPoNumber(trimToNull(request.customerPoNumber()));
    order.setQuotationReference(trimToNull(request.quotationReference()));
    order.setPaymentDueDays(request.paymentDueDays());
    if (request.taxRate() != null) {
      order.setTaxRate(scaleRate(request.taxRate()));
    }
    if (request.discountPercent() != null) {
      order.setDiscountPercent(scaleRate(request.discountPercent()));
    }
    if (request.customerCreditLimit() != null) {
      order.setCustomerCreditLimit(scaleMoney(request.customerCreditLimit()));
    }
    if (request.customerOutstandingAmount() != null) {
      order.setCustomerOutstandingAmount(scaleMoney(request.customerOutstandingAmount()));
    }
    order.setConfirmationAttachmentUrl(trimToNull(request.confirmationAttachmentUrl()));
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
    BigDecimal discountPercent = scaleRate(order.getDiscountPercent());
    BigDecimal discountAmount = BigDecimal.ZERO;
    if (discountPercent.compareTo(BigDecimal.ZERO) > 0) {
      discountAmount = taxable.multiply(discountPercent).divide(ONE_HUNDRED, 4, RoundingMode.HALF_UP);
    }
    BigDecimal discountedSubtotal = taxable.subtract(discountAmount).max(BigDecimal.ZERO);
    BigDecimal taxRate = defaultMoney(order.getTaxRate());
    BigDecimal taxTotal = BigDecimal.ZERO;
    if (taxRate.compareTo(BigDecimal.ZERO) > 0) {
      taxTotal = discountedSubtotal.multiply(taxRate).divide(ONE_HUNDRED, 4, RoundingMode.HALF_UP);
    }

    order.setSubtotal(scaleMoney(subtotal));
    order.setDiscountPercent(discountPercent);
    order.setDiscountAmount(scaleMoney(discountAmount));
    order.setTaxRate(scaleRate(order.getTaxRate()));
    order.setTaxTotal(scaleMoney(taxTotal));
    order.setTotal(scaleMoney(discountedSubtotal.add(taxTotal)));
  }

  private void validateOrder(SalesOrderEntity order) {
    List<String> issues = new ArrayList<>();
    boolean stockAvailable = validateInventoryAvailability(order, issues);
    boolean creditLimitExceeded = isCreditLimitExceeded(order);
    boolean duplicateOrder = isDuplicateOrder(order);
    boolean riskyTerms = isRiskyTerms(order);
    boolean specialDiscount = order.getDiscountPercent().compareTo(SPECIAL_DISCOUNT_THRESHOLD) >= 0;

    if (creditLimitExceeded) {
      issues.add("Customer credit exposure exceeds configured limit.");
    }
    if (duplicateOrder) {
      issues.add("Potential duplicate order detected for the same customer.");
    }
    if (riskyTerms) {
      issues.add("Payment terms require finance review.");
    }
    if (specialDiscount) {
      issues.add("Discount exceeds governance threshold.");
    }

    order.setStockAvailable(stockAvailable);
    order.setCreditLimitExceeded(creditLimitExceeded);
    order.setDuplicateOrderFlag(duplicateOrder);
    order.setRiskyPaymentTerms(riskyTerms);
    order.setSpecialDiscountFlag(specialDiscount);
    order.setValidationSummary(issues.isEmpty() ? "Order validation passed." : String.join(" ", issues));
    order.setLastValidatedAt(Instant.now());
  }

  private boolean validateInventoryAvailability(SalesOrderEntity order, List<String> issues) {
    List<InventoryReservationClient.ReserveInventoryLineRequest> reservableItems = order.getItems().stream()
        .filter(item -> item.getInventoryProductId() != null && !item.getInventoryProductId().isBlank())
        .map(item -> new InventoryReservationClient.ReserveInventoryLineRequest(
            item.getInventoryProductId(),
            item.getQuantity(),
            item.getName()
        ))
        .toList();

    if (reservableItems.isEmpty()) {
      return true;
    }

    InventoryReservationClient.ValidateInventoryResponse validation =
        inventoryReservationClient.validate(order.getId() != null ? order.getId() : UUID.randomUUID().toString(), reservableItems);
    if (validation == null) {
      issues.add("Inventory validation could not be completed.");
      return false;
    }
    if (!validation.allAvailable()) {
      issues.add(defaultString(validation.message(), "Inventory shortage detected."));
    }
    return validation.allAvailable();
  }

  private boolean isCreditLimitExceeded(SalesOrderEntity order) {
    BigDecimal creditLimit = defaultMoney(order.getCustomerCreditLimit());
    if (creditLimit.compareTo(BigDecimal.ZERO) <= 0) {
      return false;
    }
    BigDecimal exposure = defaultMoney(order.getCustomerOutstandingAmount()).add(defaultMoney(order.getTotal()));
    return exposure.compareTo(creditLimit) > 0;
  }

  private boolean isDuplicateOrder(SalesOrderEntity order) {
    if (order.getCustomerName() == null) {
      return false;
    }
    return salesOrderRepository.findTop10ByCustomerNameIgnoreCaseOrderByCreatedAtDesc(order.getCustomerName()).stream()
        .filter(existing -> !existing.getId().equals(order.getId()))
        .anyMatch(existing ->
            existing.getStatus() != SalesOrderStatus.CANCELLED
                && defaultMoney(existing.getTotal()).compareTo(defaultMoney(order.getTotal())) == 0
                && existing.getCreatedAt() != null
                && existing.getCreatedAt().isAfter(Instant.now().minusSeconds(7 * 24 * 60 * 60L)));
  }

  private boolean isRiskyTerms(SalesOrderEntity order) {
    if (order.getPaymentDueDays() != null && order.getPaymentDueDays() > RISKY_PAYMENT_DUE_DAYS) {
      return true;
    }
    String terms = trimToNull(order.getPaymentTerms());
    if (terms == null) {
      return false;
    }
    String normalized = terms.toLowerCase(Locale.ROOT);
    return normalized.contains("credit") || normalized.contains("deferred") || normalized.contains("60") || normalized.contains("90");
  }

  private void handleSubmission(SalesOrderEntity order, AppUserDetails userDetails, String remarks) {
    validateOrder(order);
    order.setSubmittedAt(Instant.now());
    List<SalesOrderApprovalRuleEntity> matchingRules = resolveApprovalRules(order);
    approvalRepository.findBySalesOrderIdOrderBySequenceNoAscCreatedAtAsc(order.getId()).forEach(approvalRepository::delete);
    if (matchingRules.isEmpty()) {
      order.setStatus(SalesOrderStatus.APPROVED);
      if (order.isStockAvailable()) {
        reserveInventory(order);
      }
      order.setApprovalSnapshot("Auto-approved. No dynamic approval rule matched this order.");
      logAudit(order.getId(), "AUTO_APPROVED", userDetails, defaultString(remarks, "Order auto-approved after submission."));
      return;
    }

    Instant now = Instant.now();
    for (SalesOrderApprovalRuleEntity rule : matchingRules) {
      SalesOrderApprovalEntity approval = new SalesOrderApprovalEntity();
      approval.setId(UUID.randomUUID().toString());
      approval.setSalesOrderId(order.getId());
      approval.setRoleKey(rule.getRoleKey());
      approval.setRoleLabel(rule.getRoleLabel());
      approval.setSequenceNo(rule.getSequenceNo());
      approval.setStatus(ApprovalDecisionStatus.PENDING);
      approval.setCreatedAt(now);
      approvalRepository.save(approval);
    }
    order.setStatus(SalesOrderStatus.PENDING_APPROVAL);
    order.setApprovalSnapshot("Awaiting approval from " + matchingRules.size() + " configured stage(s).");
    logAudit(order.getId(), "SUBMITTED", userDetails, defaultString(remarks, "Order submitted for approval."));
  }

  private List<SalesOrderApprovalRuleEntity> resolveApprovalRules(SalesOrderEntity order) {
    return approvalRuleRepository.findByActiveTrueOrderBySequenceNoAsc().stream()
        .filter(rule -> matchesRule(rule, order))
        .toList();
  }

  private boolean matchesRule(SalesOrderApprovalRuleEntity rule, SalesOrderEntity order) {
    BigDecimal total = defaultMoney(order.getTotal());
    if (rule.getMinOrderValue() != null && total.compareTo(rule.getMinOrderValue()) < 0) {
      return false;
    }
    if (rule.getMaxOrderValue() != null && total.compareTo(rule.getMaxOrderValue()) > 0) {
      return false;
    }
    if (rule.isRequireCreditLimitBreach() && !order.isCreditLimitExceeded()) {
      return false;
    }
    if (rule.isRequireInventoryShortage() && order.isStockAvailable()) {
      return false;
    }
    if (rule.isRequireRiskyTerms() && !order.isRiskyPaymentTerms()) {
      return false;
    }
    if (rule.isRequireSpecialDiscount() && !order.isSpecialDiscountFlag()) {
      return false;
    }
    return true;
  }

  private void ensureApprovalReady(SalesOrderEntity order) {
    boolean hasPendingApprovals = approvalRepository.findBySalesOrderIdOrderBySequenceNoAscCreatedAtAsc(order.getId()).stream()
        .anyMatch(item -> item.getStatus() == ApprovalDecisionStatus.PENDING);
    if (hasPendingApprovals) {
      throw new BadRequestException("All approval stages must be completed first.");
    }
  }

  private void markApproved(SalesOrderEntity order, AppUserDetails userDetails, String remarks) {
    order.setStatus(SalesOrderStatus.APPROVED);
    if (order.isStockAvailable() && !order.isInventoryReserved()) {
      reserveInventory(order);
    }
    logAudit(order.getId(), "APPROVED", userDetails, defaultString(remarks, "Sales order approved."));
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

  private void logAudit(String orderId, String actionType, AppUserDetails userDetails, String details) {
    if (orderId == null) {
      return;
    }
    SalesOrderAuditLogEntity log = new SalesOrderAuditLogEntity();
    log.setId(UUID.randomUUID().toString());
    log.setSalesOrderId(orderId);
    log.setActionType(actionType);
    log.setActorUserId(userDetails != null ? userDetails.getUserId() : null);
    log.setActorName(userDetails != null ? userDetails.getFullName() : null);
    log.setDetails(details);
    log.setCreatedAt(Instant.now());
    auditLogRepository.save(log);
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

    List<SalesOrderDtos.SalesOrderApprovalResponse> approvals = approvalRepository.findBySalesOrderIdOrderBySequenceNoAscCreatedAtAsc(order.getId()).stream()
        .map(item -> new SalesOrderDtos.SalesOrderApprovalResponse(
            item.getId(),
            item.getRoleKey(),
            item.getRoleLabel(),
            item.getSequenceNo(),
            item.getStatus().name(),
            item.getRemarks(),
            item.getApproverName(),
            item.getCreatedAt(),
            item.getDecidedAt()
        ))
        .toList();

    List<SalesOrderDtos.SalesOrderAuditLogResponse> auditLogs = auditLogRepository.findTop50BySalesOrderIdOrderByCreatedAtDesc(order.getId()).stream()
        .map(item -> new SalesOrderDtos.SalesOrderAuditLogResponse(
            item.getId(),
            item.getActionType(),
            item.getActorName(),
            item.getDetails(),
            item.getCreatedAt()
        ))
        .toList();

    SalesOrderDtos.SalesOrderValidationSnapshot validation = new SalesOrderDtos.SalesOrderValidationSnapshot(
        order.isStockAvailable(),
        order.isCreditLimitExceeded(),
        order.isDuplicateOrderFlag(),
        order.isRiskyPaymentTerms(),
        order.isSpecialDiscountFlag(),
        order.getValidationSummary(),
        order.getLastValidatedAt()
    );

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
        order.getDeliveryDate(),
        order.getPaymentTerms(),
        order.getCustomerPoNumber(),
        order.getQuotationReference(),
        order.getPaymentDueDays(),
        order.getSubtotal(),
        order.getTaxRate(),
        order.getTaxTotal(),
        order.getDiscountPercent(),
        order.getDiscountAmount(),
        order.getTotal(),
        order.getCustomerCreditLimit(),
        order.getCustomerOutstandingAmount(),
        order.isCreditLimitExceeded(),
        order.isStockAvailable(),
        order.isDuplicateOrderFlag(),
        order.isRiskyPaymentTerms(),
        order.isSpecialDiscountFlag(),
        validation,
        order.getSubmittedAt(),
        order.getConfirmedAt(),
        order.getConfirmedByName(),
        order.getConfirmationAttachmentUrl(),
        order.isInventoryReserved(),
        order.getInventoryReservationMessage(),
        order.getInventoryReservedAt(),
        approvals,
        auditLogs,
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
        order.getPaymentTerms(),
        order.getDeliveryDate(),
        order.isCreditLimitExceeded(),
        order.isStockAvailable(),
        order.isInventoryReserved(),
        order.getCreatedAt(),
        order.getUpdatedAt()
    );
  }

  private SalesOrderDtos.SalesOrderApprovalRuleResponse toApprovalRuleResponse(SalesOrderApprovalRuleEntity entity) {
    return new SalesOrderDtos.SalesOrderApprovalRuleResponse(
        entity.getId(),
        entity.getRoleKey(),
        entity.getRoleLabel(),
        entity.getSequenceNo(),
        entity.getMinOrderValue(),
        entity.getMaxOrderValue(),
        entity.isRequireCreditLimitBreach(),
        entity.isRequireInventoryShortage(),
        entity.isRequireRiskyTerms(),
        entity.isRequireSpecialDiscount(),
        entity.isActive()
    );
  }

  private void applyApprovalRule(SalesOrderApprovalRuleEntity entity, SalesOrderDtos.SalesOrderApprovalRuleRequest request) {
    entity.setRoleKey(requiredTrimmed(request.roleKey(), "Role key is required."));
    entity.setRoleLabel(requiredTrimmed(request.roleLabel(), "Role label is required."));
    entity.setSequenceNo(request.sequenceNo());
    entity.setMinOrderValue(scaleMoneyNullable(request.minOrderValue()));
    entity.setMaxOrderValue(scaleMoneyNullable(request.maxOrderValue()));
    entity.setRequireCreditLimitBreach(request.requireCreditLimitBreach());
    entity.setRequireInventoryShortage(request.requireInventoryShortage());
    entity.setRequireRiskyTerms(request.requireRiskyTerms());
    entity.setRequireSpecialDiscount(request.requireSpecialDiscount());
    entity.setActive(request.active());
  }

  private boolean isLocked(SalesOrderStatus status) {
    return status == SalesOrderStatus.CONFIRMED || status == SalesOrderStatus.CLOSED || status == SalesOrderStatus.PAID;
  }

  private void enforceStatusTransition(SalesOrderStatus current, SalesOrderStatus target) {
    if (current == target) {
      return;
    }
    if (current == SalesOrderStatus.CANCELLED || current == SalesOrderStatus.CLOSED || current == SalesOrderStatus.PAID) {
      throw new BadRequestException("This order can no longer transition.");
    }
    if (target == SalesOrderStatus.CONFIRMED && current != SalesOrderStatus.APPROVED) {
      throw new BadRequestException("Only approved orders can be confirmed.");
    }
  }

  private void touch(SalesOrderEntity order, AppUserDetails userDetails) {
    order.setUpdatedAt(Instant.now());
    if (userDetails != null) {
      order.setUpdatedByUserId(userDetails.getUserId());
      order.setUpdatedByName(userDetails.getFullName());
    }
  }

  private void applyUser(SalesOrderEntity order, AppUserDetails userDetails) {
    if (userDetails == null) {
      return;
    }
    order.setCreatedByUserId(userDetails.getUserId());
    order.setCreatedByName(userDetails.getFullName());
    order.setUpdatedByUserId(userDetails.getUserId());
    order.setUpdatedByName(userDetails.getFullName());
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

  private String defaultString(String value, String fallback) {
    String trimmed = trimToNull(value);
    return trimmed != null ? trimmed : fallback;
  }

  private String resolveApproverName(AppUserDetails userDetails, String fallback) {
    if (userDetails != null && trimToNull(userDetails.getFullName()) != null) {
      return userDetails.getFullName();
    }
    return trimToNull(fallback);
  }

  private BigDecimal defaultMoney(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private BigDecimal scaleMoney(BigDecimal value) {
    return defaultMoney(value).setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal scaleMoneyNullable(BigDecimal value) {
    if (value == null) {
      return null;
    }
    return scaleMoney(value);
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
