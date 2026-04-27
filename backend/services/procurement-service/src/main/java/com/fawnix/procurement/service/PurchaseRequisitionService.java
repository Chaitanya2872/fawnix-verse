package com.fawnix.procurement.service;

import com.fawnix.procurement.client.InventoryClient;
import com.fawnix.procurement.client.dto.InventoryProductResponse;
import com.fawnix.procurement.common.exception.BadRequestException;
import com.fawnix.procurement.common.exception.ForbiddenOperationException;
import com.fawnix.procurement.common.exception.ResourceNotFoundException;
import com.fawnix.procurement.domain.ApprovalAction;
import com.fawnix.procurement.domain.ApprovalLog;
import com.fawnix.procurement.domain.ApprovalStep;
import com.fawnix.procurement.domain.ApprovalWorkflow;
import com.fawnix.procurement.domain.PurchaseRequisition;
import com.fawnix.procurement.domain.PurchaseRequisitionDocument;
import com.fawnix.procurement.domain.PurchaseRequisitionDocumentType;
import com.fawnix.procurement.domain.PurchaseRequisitionItem;
import com.fawnix.procurement.domain.PurchaseRequisitionStatus;
import com.fawnix.procurement.domain.PurchaseRequisitionType;
import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.mapper.ProcurementMapper;
import com.fawnix.procurement.repository.ApprovalLogRepository;
import com.fawnix.procurement.repository.ApprovalStepRepository;
import com.fawnix.procurement.repository.ApprovalWorkflowRepository;
import com.fawnix.procurement.repository.PurchaseRequisitionDocumentRepository;
import com.fawnix.procurement.repository.PurchaseRequisitionItemRepository;
import com.fawnix.procurement.repository.PurchaseRequisitionRepository;
import feign.FeignException;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PurchaseRequisitionService {

  private static final String PROCUREMENT_MODULE = "PROCUREMENT";
  private static final String ENTITY_TYPE_PURCHASE_REQUISITION = "PURCHASE_REQUISITION";
  private static final long MAX_PR_DOCUMENT_BYTES = 10L * 1024L * 1024L;

  private final PurchaseRequisitionRepository purchaseRequisitionRepository;
  private final PurchaseRequisitionDocumentRepository purchaseRequisitionDocumentRepository;
  private final PurchaseRequisitionItemRepository purchaseRequisitionItemRepository;
  private final ApprovalWorkflowRepository approvalWorkflowRepository;
  private final ApprovalStepRepository approvalStepRepository;
  private final ApprovalLogRepository approvalLogRepository;
  private final InventoryClient inventoryClient;
  private final ProcurementMapper procurementMapper;

  public PurchaseRequisitionService(
      PurchaseRequisitionRepository purchaseRequisitionRepository,
      PurchaseRequisitionDocumentRepository purchaseRequisitionDocumentRepository,
      PurchaseRequisitionItemRepository purchaseRequisitionItemRepository,
      ApprovalWorkflowRepository approvalWorkflowRepository,
      ApprovalStepRepository approvalStepRepository,
      ApprovalLogRepository approvalLogRepository,
      InventoryClient inventoryClient,
      ProcurementMapper procurementMapper
  ) {
    this.purchaseRequisitionRepository = purchaseRequisitionRepository;
    this.purchaseRequisitionDocumentRepository = purchaseRequisitionDocumentRepository;
    this.purchaseRequisitionItemRepository = purchaseRequisitionItemRepository;
    this.approvalWorkflowRepository = approvalWorkflowRepository;
    this.approvalStepRepository = approvalStepRepository;
    this.approvalLogRepository = approvalLogRepository;
    this.inventoryClient = inventoryClient;
    this.procurementMapper = procurementMapper;
  }

  @Transactional
  public ProcurementDtos.PurchaseRequisitionResponse createPurchaseRequisition(ProcurementDtos.CreatePurchaseRequisitionRequest request) {
    PurchaseRequisition requisition = new PurchaseRequisition();
    requisition.setId(UUID.randomUUID());
    requisition.setPrNumber(generateDocumentNumber("PR"));
    applyPurchaseRequisitionFields(
        requisition,
        request.requesterId(),
        request.requestType(),
        request.department(),
        request.title(),
        request.description(),
        request.purpose(),
        request.neededByDate(),
        request.priority(),
        request.requestCategory(),
        request.budgetName(),
        request.budgetType(),
        request.budgetPeriod(),
        request.allocatedBudget(),
        request.committedAmount(),
        request.actualSpend()
    );
    requisition.setStatus(PurchaseRequisitionStatus.DRAFT);

    PurchaseRequisition saved = purchaseRequisitionRepository.save(requisition);
    List<PurchaseRequisitionItem> items = request.items().stream()
        .map(itemRequest -> createRequisitionItem(saved, itemRequest))
        .toList();
    purchaseRequisitionItemRepository.saveAll(items);
    return procurementMapper.toPurchaseRequisitionResponse(saved, items);
  }

  @Transactional
  public ProcurementDtos.PurchaseRequisitionResponse updatePurchaseRequisition(
      UUID id,
      ProcurementDtos.UpdatePurchaseRequisitionRequest request
  ) {
    PurchaseRequisition requisition = requirePurchaseRequisition(id);
    validateEditableRequisition(requisition);

    applyPurchaseRequisitionFields(
        requisition,
        request.requesterId(),
        request.requestType(),
        request.department(),
        request.title(),
        request.description(),
        request.purpose(),
        request.neededByDate(),
        request.priority(),
        request.requestCategory(),
        request.budgetName(),
        request.budgetType(),
        request.budgetPeriod(),
        request.allocatedBudget(),
        request.committedAmount(),
        request.actualSpend()
    );
    purchaseRequisitionRepository.save(requisition);

    purchaseRequisitionItemRepository.deleteByPurchaseRequisitionId(id);
    List<PurchaseRequisitionItem> items = request.items().stream()
        .map(itemRequest -> createRequisitionItem(requisition, itemRequest))
        .toList();
    purchaseRequisitionItemRepository.saveAll(items);
    return procurementMapper.toPurchaseRequisitionResponse(requisition, items);
  }

  @Transactional(readOnly = true)
  public List<ProcurementDtos.PurchaseRequisitionResponse> getPurchaseRequisitions() {
    return purchaseRequisitionRepository.findAll().stream()
        .map(requisition -> procurementMapper.toPurchaseRequisitionResponse(requisition, getItems(requisition.getId())))
        .toList();
  }

  @Transactional(readOnly = true)
  public ProcurementDtos.PurchaseRequisitionResponse getPurchaseRequisition(UUID id) {
    PurchaseRequisition requisition = requirePurchaseRequisition(id);
    return procurementMapper.toPurchaseRequisitionResponse(requisition, getItems(requisition.getId()));
  }

  @Transactional
  public void deletePurchaseRequisition(UUID id) {
    PurchaseRequisition requisition = requirePurchaseRequisition(id);
    validateEditableRequisition(requisition);
    approvalLogRepository.deleteByEntityTypeAndEntityId(ENTITY_TYPE_PURCHASE_REQUISITION, id);
    purchaseRequisitionDocumentRepository.deleteByPurchaseRequisitionId(id);
    purchaseRequisitionItemRepository.deleteByPurchaseRequisitionId(id);
    purchaseRequisitionRepository.delete(requisition);
  }

  @Transactional(readOnly = true)
  public List<ProcurementDtos.PurchaseRequisitionDocumentResponse> getPurchaseRequisitionDocuments(UUID id) {
    requirePurchaseRequisition(id);
    return purchaseRequisitionDocumentRepository.findAllByPurchaseRequisitionIdOrderByCreatedAtDesc(id).stream()
        .map(procurementMapper::toPurchaseRequisitionDocumentResponse)
        .toList();
  }

  @Transactional
  public ProcurementDtos.PurchaseRequisitionDocumentResponse uploadPurchaseRequisitionDocument(
      UUID id,
      PurchaseRequisitionDocumentType documentType,
      MultipartFile file
  ) {
    PurchaseRequisition requisition = requirePurchaseRequisition(id);
    validatePurchaseRequisitionDocument(documentType, file);

    PurchaseRequisitionDocument document = new PurchaseRequisitionDocument();
    document.setId(UUID.randomUUID());
    document.setPurchaseRequisition(requisition);
    document.setDocumentType(documentType);
    document.setFileName(StringUtils.cleanPath(file.getOriginalFilename()));
    document.setContentType(trimToNull(file.getContentType()));
    document.setFileSize(file.getSize());
    try {
      document.setFileData(file.getBytes());
    } catch (IOException exception) {
      throw new BadRequestException("Failed to read uploaded requisition document.");
    }

    return procurementMapper.toPurchaseRequisitionDocumentResponse(
        purchaseRequisitionDocumentRepository.save(document)
    );
  }

  @Transactional(readOnly = true)
  public PurchaseRequisitionDocumentContent getPurchaseRequisitionDocumentContent(UUID id, UUID documentId) {
    PurchaseRequisitionDocument document = requirePurchaseRequisitionDocument(id, documentId);
    MediaType mediaType;
    try {
      mediaType = document.getContentType() != null
          ? MediaType.parseMediaType(document.getContentType())
          : MediaType.APPLICATION_OCTET_STREAM;
    } catch (IllegalArgumentException exception) {
      mediaType = MediaType.APPLICATION_OCTET_STREAM;
    }
    return new PurchaseRequisitionDocumentContent(document.getFileName(), mediaType, document.getFileData());
  }

  @Transactional
  public void deletePurchaseRequisitionDocument(UUID id, UUID documentId) {
    purchaseRequisitionDocumentRepository.delete(requirePurchaseRequisitionDocument(id, documentId));
  }

  @Transactional
  public ProcurementDtos.PurchaseRequisitionResponse updatePurchaseRequisitionBudget(
      UUID id,
      ProcurementDtos.UpdatePurchaseRequisitionBudgetRequest request
  ) {
    PurchaseRequisition requisition = requirePurchaseRequisition(id);
    if (requisition.getStatus() == PurchaseRequisitionStatus.PO_CREATED) {
      throw new BadRequestException("Budget validation cannot be changed after a purchase order is created.");
    }

    requisition.setBudgetName(trimToNull(request.budgetName()));
    requisition.setBudgetType(request.budgetType());
    requisition.setBudgetPeriod(trimToNull(request.budgetPeriod()));
    requisition.setAllocatedBudget(request.allocatedBudget() == null ? BigDecimal.ZERO : scale(request.allocatedBudget()));
    requisition.setCommittedAmount(request.committedAmount() == null ? BigDecimal.ZERO : scale(request.committedAmount()));
    requisition.setActualSpend(request.actualSpend() == null ? BigDecimal.ZERO : scale(request.actualSpend()));
    requisition.setBudgetValidationNotes(trimToNull(request.validationNotes()));
    requisition.setBudgetExceptionJustification(trimToNull(request.exceptionJustification()));
    purchaseRequisitionRepository.save(requisition);
    return procurementMapper.toPurchaseRequisitionResponse(requisition, getItems(requisition.getId()));
  }

  @Transactional
  public ProcurementDtos.PurchaseRequisitionResponse updatePurchaseRequisitionEvaluation(
      UUID id,
      ProcurementDtos.UpdatePurchaseRequisitionEvaluationRequest request
  ) {
    PurchaseRequisition requisition = requirePurchaseRequisition(id);
    if (requisition.getStatus() == PurchaseRequisitionStatus.PO_CREATED) {
      throw new BadRequestException("Evaluation notes cannot be changed after a purchase order is created.");
    }

    requisition.setEvaluationDecision(trimToNull(request.decision()));
    requisition.setEvaluationNotes(trimToNull(request.notes()));
    requisition.setEvaluationUpdatedAt(Instant.now());
    purchaseRequisitionRepository.save(requisition);
    return procurementMapper.toPurchaseRequisitionResponse(requisition, getItems(requisition.getId()));
  }

  @Transactional
  public ProcurementDtos.PurchaseRequisitionResponse updatePurchaseRequisitionNegotiation(
      UUID id,
      ProcurementDtos.UpdatePurchaseRequisitionNegotiationRequest request
  ) {
    PurchaseRequisition requisition = requirePurchaseRequisition(id);
    if (requisition.getStatus() == PurchaseRequisitionStatus.REJECTED) {
      throw new BadRequestException("Negotiation cannot be updated for a rejected requisition.");
    }
    if (requisition.getStatus() == PurchaseRequisitionStatus.PO_CREATED) {
      throw new BadRequestException("Negotiation cannot be changed after a purchase order is created.");
    }

    requisition.setNegotiationVendorId(request.vendorId());
    requisition.setNegotiatedAmount(request.negotiatedAmount() == null ? null : scale(request.negotiatedAmount()));
    requisition.setNegotiationDeliveryTimeline(trimToNull(request.deliveryTimeline()));
    requisition.setNegotiationPaymentTerms(trimToNull(request.paymentTerms()));
    requisition.setNegotiationDiscountPercent(request.discountPercent() == null ? null : scale(request.discountPercent()));
    requisition.setNegotiationDiscountAmount(request.discountAmount() == null ? null : scale(request.discountAmount()));
    requisition.setNegotiationNotes(trimToNull(request.notes()));
    requisition.setNegotiationUpdatedAt(Instant.now());
    purchaseRequisitionRepository.save(requisition);
    return procurementMapper.toPurchaseRequisitionResponse(requisition, getItems(requisition.getId()));
  }

  @Transactional
  public ProcurementDtos.PurchaseRequisitionResponse submitPurchaseRequisition(UUID id, UUID actorId) {
    PurchaseRequisition requisition = requirePurchaseRequisition(id);
    validateTransition(requisition.getStatus(), PurchaseRequisitionStatus.SUBMITTED);
    List<PurchaseRequisitionItem> items = getItems(id);
    if (items.isEmpty()) {
      throw new BadRequestException("Purchase requisition must contain at least one item.");
    }
    BigDecimal totalAmount = calculateTotal(items);

    ApprovalWorkflow workflow = approvalWorkflowRepository.findFirstByModuleAndActiveTrue(PROCUREMENT_MODULE)
        .orElseThrow(() -> new BadRequestException("No active approval workflow configured for procurement."));
    List<ApprovalStep> steps = getApplicableApprovalSteps(workflow, totalAmount);
    if (steps.isEmpty()) {
      throw new BadRequestException(
          "No approval or budget validation step is configured for requisition amount " + totalAmount + "."
      );
    }

    requisition.setWorkflow(workflow);
    requisition.setCurrentStepOrder(steps.get(0).getStepOrder());
    requisition.setStatus(PurchaseRequisitionStatus.SUBMITTED);
    requisition.setSubmittedAt(Instant.now());
    requisition.setRejectedAt(null);
    requisition.setRejectionReason(null);
    purchaseRequisitionRepository.save(requisition);

    logApproval(requisition, workflow, steps.get(0), ApprovalAction.SUBMITTED, actorId, "Purchase requisition submitted.");
    return procurementMapper.toPurchaseRequisitionResponse(requisition, items);
  }

  @Transactional
  public ProcurementDtos.PurchaseRequisitionResponse reviewPurchaseRequisition(
      UUID id,
      ProcurementDtos.ApprovalDecisionRequest request
  ) {
    PurchaseRequisition requisition = requirePurchaseRequisition(id);
    if (request.action() == ApprovalAction.SUBMITTED) {
      throw new BadRequestException("Only APPROVED or REJECTED actions are allowed.");
    }
    if (requisition.getStatus() != PurchaseRequisitionStatus.SUBMITTED) {
      throw new BadRequestException("Only submitted requisitions can be reviewed.");
    }
    ApprovalWorkflow workflow = resolveWorkflow(requisition);
    List<PurchaseRequisitionItem> items = getItems(id);
    BigDecimal totalAmount = calculateTotal(items);
    List<ApprovalStep> steps = getApplicableApprovalSteps(workflow, totalAmount);
    ApprovalStep currentStep = steps.stream()
        .filter(step -> step.getStepOrder().equals(requisition.getCurrentStepOrder()))
        .findFirst()
        .orElseThrow(() -> new ResourceNotFoundException("Current approval step not found for requisition amount."));
    validateApprover(currentStep, request.actorId());

    if (request.action() == ApprovalAction.REJECTED) {
      requisition.setStatus(PurchaseRequisitionStatus.REJECTED);
      requisition.setRejectedAt(Instant.now());
      requisition.setRejectionReason(trimToNull(request.remarks()));
      requisition.setCurrentStepOrder(null);
      purchaseRequisitionRepository.save(requisition);
      logApproval(requisition, workflow, currentStep, ApprovalAction.REJECTED, request.actorId(), request.remarks());
      return procurementMapper.toPurchaseRequisitionResponse(requisition, items);
    }

    int currentIndex = steps.indexOf(currentStep);
    ApprovalStep nextStep = currentIndex >= 0 && currentIndex + 1 < steps.size()
        ? steps.get(currentIndex + 1)
        : null;
    if (nextStep == null) {
      requisition.setStatus(PurchaseRequisitionStatus.APPROVED);
      requisition.setApprovedAt(Instant.now());
      requisition.setCurrentStepOrder(null);
    } else {
      requisition.setCurrentStepOrder(nextStep.getStepOrder());
    }
    requisition.setRejectedAt(null);
    requisition.setRejectionReason(null);
    purchaseRequisitionRepository.save(requisition);
    logApproval(requisition, workflow, currentStep, ApprovalAction.APPROVED, request.actorId(), request.remarks());
    return procurementMapper.toPurchaseRequisitionResponse(requisition, items);
  }

  public PurchaseRequisition requireApprovedPurchaseRequisition(UUID id) {
    PurchaseRequisition requisition = requirePurchaseRequisition(id);
    if (requisition.getStatus() != PurchaseRequisitionStatus.APPROVED) {
      throw new BadRequestException("Purchase order can be created only from an approved requisition.");
    }
    return requisition;
  }

  @Transactional
  public void markPurchaseOrderCreated(PurchaseRequisition requisition) {
    validateTransition(requisition.getStatus(), PurchaseRequisitionStatus.PO_CREATED);
    requisition.setStatus(PurchaseRequisitionStatus.PO_CREATED);
    purchaseRequisitionRepository.save(requisition);
  }

  @Transactional(readOnly = true)
  public List<PurchaseRequisitionItem> getItems(UUID purchaseRequisitionId) {
    return purchaseRequisitionItemRepository.findByPurchaseRequisitionId(purchaseRequisitionId);
  }

  public PurchaseRequisition requirePurchaseRequisition(UUID id) {
    return purchaseRequisitionRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Purchase requisition not found."));
  }

  private PurchaseRequisitionDocument requirePurchaseRequisitionDocument(UUID requisitionId, UUID documentId) {
    requirePurchaseRequisition(requisitionId);
    return purchaseRequisitionDocumentRepository.findByIdAndPurchaseRequisitionId(documentId, requisitionId)
        .orElseThrow(() -> new ResourceNotFoundException("Purchase requisition document not found."));
  }

  private PurchaseRequisitionItem createRequisitionItem(
      PurchaseRequisition requisition,
      ProcurementDtos.PurchaseRequisitionItemRequest request
  ) {
    PurchaseRequisitionItem item = new PurchaseRequisitionItem();
    item.setId(UUID.randomUUID());
    item.setPurchaseRequisition(requisition);

    if (request.productId() != null) {
      InventoryProductResponse product = fetchProduct(request.productId());
      item.setProductId(request.productId());
      item.setSku(firstNonBlank(trimToNull(request.sku()), product.sku()));
      item.setProductName(firstNonBlank(trimToNull(request.productName()), product.name()));
      item.setCategory(firstNonBlank(trimToNull(request.category()), product.category()));
      item.setUnit(firstNonBlank(trimToNull(request.unit()), product.unit()));
      item.setEstimatedUnitPrice(scale(resolvePrice(product.price(), request.estimatedUnitPrice())));
    } else {
      item.setProductId(null);
      item.setSku(trimToNull(request.sku()));
      item.setProductName(requireNonBlank(request.productName(), "Product name is required for non-inventory items."));
      item.setCategory(trimToNull(request.category()));
      item.setUnit(requireNonBlank(request.unit(), "Unit is required for non-inventory items."));
      item.setEstimatedUnitPrice(scale(requireNonNegative(request.estimatedUnitPrice(), "Estimated unit price is required for non-inventory items.")));
    }

    item.setQuantity(scale(request.quantity()));
    BigDecimal taxPercent = request.taxPercent() == null ? BigDecimal.ZERO : scale(request.taxPercent());
    item.setTaxPercent(taxPercent);
    BigDecimal baseAmount = item.getQuantity().multiply(item.getEstimatedUnitPrice());
    BigDecimal taxAmount = baseAmount.multiply(taxPercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    item.setLineTotal(scale(baseAmount.add(taxAmount)));
    item.setRemarks(trimToNull(request.remarks()));
    return item;
  }

  private InventoryProductResponse fetchProduct(UUID productId) {
    try {
      return inventoryClient.getProduct(productId);
    } catch (FeignException.NotFound exception) {
      throw new BadRequestException("Product " + productId + " was not found in inventory-service.");
    }
  }

  private ApprovalWorkflow resolveWorkflow(PurchaseRequisition requisition) {
    ApprovalWorkflow workflow = requisition.getWorkflow();
    if (workflow == null) {
      throw new ResourceNotFoundException("Approval workflow not found for requisition.");
    }
    return workflow;
  }

  private List<ApprovalStep> getApplicableApprovalSteps(ApprovalWorkflow workflow, BigDecimal totalAmount) {
    return approvalStepRepository.findByWorkflowIdOrderByStepOrderAsc(workflow.getId()).stream()
        .filter(step -> isAmountWithinRange(totalAmount, step))
        .toList();
  }

  private boolean isAmountWithinRange(BigDecimal totalAmount, ApprovalStep step) {
    boolean aboveMinimum = step.getMinAmount() == null || totalAmount.compareTo(step.getMinAmount()) >= 0;
    boolean belowMaximum = step.getMaxAmount() == null || totalAmount.compareTo(step.getMaxAmount()) <= 0;
    return aboveMinimum && belowMaximum;
  }

  private BigDecimal calculateTotal(List<PurchaseRequisitionItem> items) {
    return scale(items.stream()
        .map(PurchaseRequisitionItem::getLineTotal)
        .reduce(BigDecimal.ZERO, BigDecimal::add));
  }

  private void validatePurchaseRequisitionDocument(PurchaseRequisitionDocumentType documentType, MultipartFile file) {
    if (documentType == null) {
      throw new BadRequestException("Requisition document type is required.");
    }
    if (file == null || file.isEmpty()) {
      throw new BadRequestException("Requisition document file is required.");
    }
    if (!StringUtils.hasText(file.getOriginalFilename())) {
      throw new BadRequestException("Requisition document name is required.");
    }
    if (file.getSize() > MAX_PR_DOCUMENT_BYTES) {
      throw new BadRequestException("Requisition document exceeds the 10 MB upload limit.");
    }
  }

  private void validateApprover(ApprovalStep step, UUID actorId) {
    if (step.getApproverUserId() != null && !step.getApproverUserId().equals(actorId)) {
      throw new ForbiddenOperationException("This requisition is assigned to a different approver.");
    }
  }

  private void validateEditableRequisition(PurchaseRequisition requisition) {
    if (requisition.getStatus() != PurchaseRequisitionStatus.DRAFT) {
      throw new BadRequestException("Only draft purchase requisitions can be edited or deleted.");
    }
  }

  private void applyPurchaseRequisitionFields(
      PurchaseRequisition requisition,
      UUID requesterId,
      PurchaseRequisitionType requestType,
      String department,
      String title,
      String description,
      String purpose,
      LocalDate neededByDate,
      com.fawnix.procurement.domain.PurchaseRequisitionPriority priority,
      String requestCategory,
      String budgetName,
      com.fawnix.procurement.domain.BudgetContextType budgetType,
      String budgetPeriod,
      BigDecimal allocatedBudget,
      BigDecimal committedAmount,
      BigDecimal actualSpend
  ) {
    requisition.setRequesterId(requesterId);
    requisition.setRequestType(requestType == null ? PurchaseRequisitionType.INTERNAL_USE : requestType);
    requisition.setDepartment(requireNonBlank(department, "Department is required."));
    requisition.setTitle(requireNonBlank(title, "Title is required."));
    requisition.setDescription(trimToNull(description));
    requisition.setPurpose(firstNonBlank(trimToNull(purpose), trimToNull(description)));
    requisition.setNeededByDate(neededByDate);
    requisition.setPriority(priority);
    requisition.setRequestCategory(trimToNull(requestCategory));
    requisition.setBudgetName(trimToNull(budgetName));
    requisition.setBudgetType(budgetType);
    requisition.setBudgetPeriod(trimToNull(budgetPeriod));
    requisition.setAllocatedBudget(allocatedBudget == null ? BigDecimal.ZERO : scale(allocatedBudget));
    requisition.setCommittedAmount(committedAmount == null ? BigDecimal.ZERO : scale(committedAmount));
    requisition.setActualSpend(actualSpend == null ? BigDecimal.ZERO : scale(actualSpend));
  }

  private void validateTransition(PurchaseRequisitionStatus currentStatus, PurchaseRequisitionStatus targetStatus) {
    boolean allowed = switch (currentStatus) {
      case DRAFT -> targetStatus == PurchaseRequisitionStatus.SUBMITTED;
      case SUBMITTED -> targetStatus == PurchaseRequisitionStatus.APPROVED || targetStatus == PurchaseRequisitionStatus.REJECTED;
      case APPROVED -> targetStatus == PurchaseRequisitionStatus.PO_CREATED;
      case REJECTED, PO_CREATED -> false;
    };
    if (!allowed) {
      throw new BadRequestException("Invalid requisition status transition from " + currentStatus + " to " + targetStatus + ".");
    }
  }

  private void logApproval(
      PurchaseRequisition requisition,
      ApprovalWorkflow workflow,
      ApprovalStep step,
      ApprovalAction action,
      UUID actorId,
      String remarks
  ) {
    ApprovalLog log = new ApprovalLog();
    log.setId(UUID.randomUUID());
    log.setWorkflow(workflow);
    log.setStep(step);
    log.setEntityType(ENTITY_TYPE_PURCHASE_REQUISITION);
    log.setEntityId(requisition.getId());
    log.setAction(action);
    log.setActorId(actorId);
    log.setRemarks(trimToNull(remarks));
    approvalLogRepository.save(log);
  }

  private String generateDocumentNumber(String prefix) {
    String day = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    return prefix + "-" + day + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
  }

  private BigDecimal resolvePrice(BigDecimal price, BigDecimal fallback) {
    if (price != null) {
      return price;
    }
    return fallback == null ? BigDecimal.ZERO : fallback;
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

  private String requireNonBlank(String value, String message) {
    String trimmed = trimToNull(value);
    if (trimmed == null) {
      throw new BadRequestException(message);
    }
    return trimmed;
  }

  private BigDecimal requireNonNegative(BigDecimal value, String message) {
    if (value == null || value.compareTo(BigDecimal.ZERO) < 0) {
      throw new BadRequestException(message);
    }
    return value;
  }

  private String firstNonBlank(String first, String second) {
    return first != null ? first : second;
  }

  public record PurchaseRequisitionDocumentContent(
      String fileName,
      MediaType mediaType,
      byte[] content
  ) {
  }
}
