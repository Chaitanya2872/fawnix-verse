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
import com.fawnix.procurement.domain.PurchaseRequisitionItem;
import com.fawnix.procurement.domain.PurchaseRequisitionStatus;
import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.mapper.ProcurementMapper;
import com.fawnix.procurement.repository.ApprovalLogRepository;
import com.fawnix.procurement.repository.ApprovalStepRepository;
import com.fawnix.procurement.repository.ApprovalWorkflowRepository;
import com.fawnix.procurement.repository.PurchaseRequisitionItemRepository;
import com.fawnix.procurement.repository.PurchaseRequisitionRepository;
import feign.FeignException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PurchaseRequisitionService {

  private static final String PROCUREMENT_MODULE = "PROCUREMENT";
  private static final String ENTITY_TYPE_PURCHASE_REQUISITION = "PURCHASE_REQUISITION";

  private final PurchaseRequisitionRepository purchaseRequisitionRepository;
  private final PurchaseRequisitionItemRepository purchaseRequisitionItemRepository;
  private final ApprovalWorkflowRepository approvalWorkflowRepository;
  private final ApprovalStepRepository approvalStepRepository;
  private final ApprovalLogRepository approvalLogRepository;
  private final InventoryClient inventoryClient;
  private final ProcurementMapper procurementMapper;

  public PurchaseRequisitionService(
      PurchaseRequisitionRepository purchaseRequisitionRepository,
      PurchaseRequisitionItemRepository purchaseRequisitionItemRepository,
      ApprovalWorkflowRepository approvalWorkflowRepository,
      ApprovalStepRepository approvalStepRepository,
      ApprovalLogRepository approvalLogRepository,
      InventoryClient inventoryClient,
      ProcurementMapper procurementMapper
  ) {
    this.purchaseRequisitionRepository = purchaseRequisitionRepository;
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
    requisition.setRequesterId(request.requesterId());
    requisition.setDepartment(request.department().trim());
    requisition.setPurpose(trimToNull(request.purpose()));
    requisition.setNeededByDate(request.neededByDate());
    requisition.setStatus(PurchaseRequisitionStatus.DRAFT);

    PurchaseRequisition saved = purchaseRequisitionRepository.save(requisition);
    List<PurchaseRequisitionItem> items = request.items().stream()
        .map(itemRequest -> createRequisitionItem(saved, itemRequest))
        .toList();
    purchaseRequisitionItemRepository.saveAll(items);
    return procurementMapper.toPurchaseRequisitionResponse(saved, items);
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
  public ProcurementDtos.PurchaseRequisitionResponse submitPurchaseRequisition(UUID id, UUID actorId) {
    PurchaseRequisition requisition = requirePurchaseRequisition(id);
    validateTransition(requisition.getStatus(), PurchaseRequisitionStatus.SUBMITTED);
    List<PurchaseRequisitionItem> items = getItems(id);
    if (items.isEmpty()) {
      throw new BadRequestException("Purchase requisition must contain at least one item.");
    }

    ApprovalWorkflow workflow = approvalWorkflowRepository.findFirstByModuleAndActiveTrue(PROCUREMENT_MODULE)
        .orElseThrow(() -> new BadRequestException("No active approval workflow configured for procurement."));
    List<ApprovalStep> steps = approvalStepRepository.findByWorkflowIdOrderByStepOrderAsc(workflow.getId());
    if (steps.isEmpty()) {
      throw new BadRequestException("Approval workflow does not contain any steps.");
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
    ApprovalWorkflow workflow = requireWorkflow(requisition);
    ApprovalStep currentStep = approvalStepRepository.findByWorkflowIdAndStepOrder(workflow.getId(), requisition.getCurrentStepOrder())
        .orElseThrow(() -> new ResourceNotFoundException("Current approval step not found."));

    validateApprover(currentStep, request.actorId());
    List<PurchaseRequisitionItem> items = getItems(id);

    if (request.action() == ApprovalAction.REJECTED) {
      requisition.setStatus(PurchaseRequisitionStatus.REJECTED);
      requisition.setRejectedAt(Instant.now());
      requisition.setRejectionReason(trimToNull(request.remarks()));
      requisition.setCurrentStepOrder(null);
      purchaseRequisitionRepository.save(requisition);
      logApproval(requisition, workflow, currentStep, ApprovalAction.REJECTED, request.actorId(), request.remarks());
      return procurementMapper.toPurchaseRequisitionResponse(requisition, items);
    }

    ApprovalStep nextStep = approvalStepRepository.findByWorkflowIdAndStepOrder(workflow.getId(), currentStep.getStepOrder() + 1)
        .orElse(null);
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

  private PurchaseRequisitionItem createRequisitionItem(
      PurchaseRequisition requisition,
      ProcurementDtos.PurchaseRequisitionItemRequest request
  ) {
    InventoryProductResponse product = fetchProduct(request.productId());
    PurchaseRequisitionItem item = new PurchaseRequisitionItem();
    item.setId(UUID.randomUUID());
    item.setPurchaseRequisition(requisition);
    item.setProductId(request.productId());
    item.setSku(product.sku());
    item.setProductName(product.name());
    item.setCategory(product.category());
    item.setUnit(product.unit());
    item.setQuantity(scale(request.quantity()));
    item.setEstimatedUnitPrice(scale(resolvePrice(product.price())));
    item.setLineTotal(scale(item.getQuantity().multiply(item.getEstimatedUnitPrice())));
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

  private ApprovalWorkflow requireWorkflow(PurchaseRequisition requisition) {
    ApprovalWorkflow workflow = requisition.getWorkflow();
    if (workflow == null) {
      throw new ResourceNotFoundException("Approval workflow not found for requisition.");
    }
    return workflow;
  }

  private void validateApprover(ApprovalStep step, UUID actorId) {
    if (step.getApproverUserId() != null && !step.getApproverUserId().equals(actorId)) {
      throw new ForbiddenOperationException("This requisition is assigned to a different approver.");
    }
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

  private BigDecimal resolvePrice(BigDecimal price) {
    return price == null ? BigDecimal.ZERO : price;
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
