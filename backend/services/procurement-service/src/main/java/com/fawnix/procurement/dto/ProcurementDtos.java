package com.fawnix.procurement.dto;

import com.fawnix.procurement.domain.ApprovalAction;
import com.fawnix.procurement.domain.BudgetContextType;
import com.fawnix.procurement.domain.GoodsReceiptStatus;
import com.fawnix.procurement.domain.InvoiceStatus;
import com.fawnix.procurement.domain.PaymentStatus;
import com.fawnix.procurement.domain.PurchaseRequisitionDocumentType;
import com.fawnix.procurement.domain.PurchaseRequisitionPriority;
import com.fawnix.procurement.domain.PurchaseOrderStatus;
import com.fawnix.procurement.domain.PurchaseRequisitionStatus;
import com.fawnix.procurement.domain.PurchaseRequisitionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class ProcurementDtos {

  private ProcurementDtos() {
  }

  public record CreatePurchaseRequisitionRequest(
      @NotNull(message = "Requester ID is required.")
      UUID requesterId,
      @NotNull(message = "Request type is required.")
      PurchaseRequisitionType requestType,
      @NotBlank(message = "Department is required.")
      String department,
      @NotBlank(message = "Title is required.")
      @Size(max = 200, message = "Title cannot exceed 200 characters.")
      String title,
      String description,
      String purpose,
      LocalDate neededByDate,
      @NotNull(message = "Priority is required.")
      PurchaseRequisitionPriority priority,
      @Size(max = 80, message = "Request category cannot exceed 80 characters.")
      String requestCategory,
      @Size(max = 160, message = "Budget name cannot exceed 160 characters.")
      String budgetName,
      BudgetContextType budgetType,
      @Size(max = 40, message = "Budget period cannot exceed 40 characters.")
      String budgetPeriod,
      @DecimalMin(value = "0.00", inclusive = true, message = "Allocated budget cannot be negative.")
      BigDecimal allocatedBudget,
      @DecimalMin(value = "0.00", inclusive = true, message = "Committed amount cannot be negative.")
      BigDecimal committedAmount,
      @DecimalMin(value = "0.00", inclusive = true, message = "Actual spend cannot be negative.")
      BigDecimal actualSpend,
      @NotEmpty(message = "At least one PR item is required.")
      List<@Valid PurchaseRequisitionItemRequest> items
  ) {
  }

  public record UpdatePurchaseRequisitionRequest(
      @NotNull(message = "Requester ID is required.")
      UUID requesterId,
      @NotNull(message = "Request type is required.")
      PurchaseRequisitionType requestType,
      @NotBlank(message = "Department is required.")
      String department,
      @NotBlank(message = "Title is required.")
      @Size(max = 200, message = "Title cannot exceed 200 characters.")
      String title,
      String description,
      String purpose,
      LocalDate neededByDate,
      @NotNull(message = "Priority is required.")
      PurchaseRequisitionPriority priority,
      @Size(max = 80, message = "Request category cannot exceed 80 characters.")
      String requestCategory,
      @Size(max = 160, message = "Budget name cannot exceed 160 characters.")
      String budgetName,
      BudgetContextType budgetType,
      @Size(max = 40, message = "Budget period cannot exceed 40 characters.")
      String budgetPeriod,
      @DecimalMin(value = "0.00", inclusive = true, message = "Allocated budget cannot be negative.")
      BigDecimal allocatedBudget,
      @DecimalMin(value = "0.00", inclusive = true, message = "Committed amount cannot be negative.")
      BigDecimal committedAmount,
      @DecimalMin(value = "0.00", inclusive = true, message = "Actual spend cannot be negative.")
      BigDecimal actualSpend,
      @NotEmpty(message = "At least one PR item is required.")
      List<@Valid PurchaseRequisitionItemRequest> items
  ) {
  }

  public record PurchaseRequisitionItemRequest(
      UUID productId,
      @Size(max = 60, message = "SKU cannot exceed 60 characters.")
      String sku,
      @Size(max = 200, message = "Product name cannot exceed 200 characters.")
      String productName,
      @Size(max = 80, message = "Category cannot exceed 80 characters.")
      String category,
      @Size(max = 20, message = "Unit cannot exceed 20 characters.")
      String unit,
      @NotNull(message = "Quantity is required.")
      @DecimalMin(value = "0.01", message = "Quantity must be greater than 0.")
      BigDecimal quantity,
      @NotNull(message = "Estimated unit price is required.")
      @DecimalMin(value = "0.00", inclusive = true, message = "Estimated unit price cannot be negative.")
      BigDecimal estimatedUnitPrice,
      @DecimalMin(value = "0.00", inclusive = true, message = "Tax percent cannot be negative.")
      BigDecimal taxPercent,
      String remarks
  ) {
  }

  public record UpdatePurchaseRequisitionBudgetRequest(
      @Size(max = 160, message = "Budget name cannot exceed 160 characters.")
      String budgetName,
      BudgetContextType budgetType,
      @Size(max = 40, message = "Budget period cannot exceed 40 characters.")
      String budgetPeriod,
      @DecimalMin(value = "0.00", inclusive = true, message = "Allocated budget cannot be negative.")
      BigDecimal allocatedBudget,
      @DecimalMin(value = "0.00", inclusive = true, message = "Committed amount cannot be negative.")
      BigDecimal committedAmount,
      @DecimalMin(value = "0.00", inclusive = true, message = "Actual spend cannot be negative.")
      BigDecimal actualSpend,
      @Size(max = 2000, message = "Validation notes cannot exceed 2000 characters.")
      String validationNotes,
      @Size(max = 2000, message = "Exception justification cannot exceed 2000 characters.")
      String exceptionJustification
  ) {
  }

  public record ApprovalDecisionRequest(
      @NotNull(message = "Action is required.")
      ApprovalAction action,
      @NotNull(message = "Actor ID is required.")
      UUID actorId,
      @Size(max = 1000, message = "Remarks cannot exceed 1000 characters.")
      String remarks
  ) {
  }

  public record UpdatePurchaseRequisitionEvaluationRequest(
      @Size(max = 120, message = "Decision cannot exceed 120 characters.")
      String decision,
      @Size(max = 2000, message = "Evaluation notes cannot exceed 2000 characters.")
      String notes
  ) {
  }

  public record UpdatePurchaseRequisitionNegotiationRequest(
      UUID vendorId,
      @DecimalMin(value = "0.00", inclusive = true, message = "Negotiated amount cannot be negative.")
      BigDecimal negotiatedAmount,
      @Size(max = 200, message = "Delivery timeline cannot exceed 200 characters.")
      String deliveryTimeline,
      @Size(max = 2000, message = "Payment terms cannot exceed 2000 characters.")
      String paymentTerms,
      @DecimalMin(value = "0.00", inclusive = true, message = "Discount percent cannot be negative.")
      BigDecimal discountPercent,
      @DecimalMin(value = "0.00", inclusive = true, message = "Discount amount cannot be negative.")
      BigDecimal discountAmount,
      @Size(max = 2000, message = "Negotiation notes cannot exceed 2000 characters.")
      String notes
  ) {
  }

  public record CreatePurchaseOrderFromRequisitionRequest(
      @NotNull(message = "Vendor ID is required.")
      UUID vendorId,
      @NotNull(message = "Order date is required.")
      LocalDate orderDate,
      LocalDate expectedDeliveryDate,
      String notes
  ) {
  }

  public record CreateGoodsReceiptRequest(
      @NotNull(message = "Purchase order ID is required.")
      UUID purchaseOrderId,
      @NotNull(message = "Receipt date is required.")
      LocalDate receiptDate,
      @NotNull(message = "Received by is required.")
      UUID receivedBy,
      String remarks
  ) {
  }

  public record CreateInvoiceRequest(
      @NotBlank(message = "Invoice number is required.")
      String invoiceNumber,
      @NotNull(message = "Purchase order ID is required.")
      UUID purchaseOrderId,
      @NotNull(message = "Invoice date is required.")
      LocalDate invoiceDate,
      LocalDate dueDate,
      @NotNull(message = "Invoice amount is required.")
      @DecimalMin(value = "0.01", message = "Invoice amount must be greater than 0.")
      BigDecimal amount
  ) {
  }

  public record CreatePaymentRequest(
      @NotNull(message = "Invoice ID is required.")
      UUID invoiceId,
      @NotNull(message = "Requested by is required.")
      UUID requestedBy,
      LocalDate paymentDate,
      String remarks
  ) {
  }

  public record CreateVendorRequest(
      @NotBlank(message = "Vendor code is required.")
      String vendorCode,
      @NotBlank(message = "Vendor name is required.")
      String vendorName,
      @Email(message = "Email must be valid.")
      String email,
      String phone,
      String taxIdentifier,
      String addressLine1,
      String addressLine2,
      String city,
      String state,
      String country,
      String postalCode
  ) {
  }

  public record UpdateVendorRequest(
      @NotBlank(message = "Vendor name is required.")
      String vendorName,
      @Email(message = "Email must be valid.")
      String email,
      String phone,
      String taxIdentifier,
      String addressLine1,
      String addressLine2,
      String city,
      String state,
      String country,
      String postalCode
  ) {
  }

  public record PurchaseRequisitionItemResponse(
      UUID id,
      UUID productId,
      String sku,
      String productName,
      String category,
      String unit,
      BigDecimal quantity,
      BigDecimal estimatedUnitPrice,
      BigDecimal taxPercent,
      BigDecimal lineTotal,
      String remarks,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record PurchaseRequisitionResponse(
      UUID id,
      String prNumber,
      UUID requesterId,
      PurchaseRequisitionType requestType,
      String department,
      String title,
      String description,
      String purpose,
      LocalDate neededByDate,
      PurchaseRequisitionPriority priority,
      String requestCategory,
      PurchaseRequisitionStatus status,
      Integer currentStepOrder,
      Instant submittedAt,
      Instant approvedAt,
      Instant rejectedAt,
      String rejectionReason,
      String budgetName,
      BudgetContextType budgetType,
      String budgetPeriod,
      BigDecimal allocatedBudget,
      BigDecimal committedAmount,
      BigDecimal actualSpend,
      String budgetValidationNotes,
      String budgetExceptionJustification,
      String evaluationDecision,
      String evaluationNotes,
      Instant evaluationUpdatedAt,
      UUID negotiationVendorId,
      BigDecimal negotiatedAmount,
      String negotiationDeliveryTimeline,
      String negotiationPaymentTerms,
      BigDecimal negotiationDiscountPercent,
      BigDecimal negotiationDiscountAmount,
      String negotiationNotes,
      Instant negotiationUpdatedAt,
      BigDecimal subtotalAmount,
      BigDecimal taxAmount,
      BigDecimal totalAmount,
      List<PurchaseRequisitionItemResponse> items,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record VendorResponse(
      UUID id,
      String vendorCode,
      String vendorName,
      String email,
      String phone,
      String taxIdentifier,
      String addressLine1,
      String addressLine2,
      String city,
      String state,
      String country,
      String postalCode,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record VendorDocumentResponse(
      UUID id,
      String fileName,
      String contentType,
      long fileSize,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record PurchaseRequisitionDocumentResponse(
      UUID id,
      PurchaseRequisitionDocumentType documentType,
      String fileName,
      String contentType,
      long fileSize,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record PurchaseOrderItemResponse(
      UUID id,
      UUID productId,
      String sku,
      String productName,
      String category,
      String unit,
      BigDecimal quantity,
      BigDecimal unitPrice,
      BigDecimal lineTotal,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record PurchaseOrderResponse(
      UUID id,
      String poNumber,
      UUID purchaseRequisitionId,
      String requisitionNumber,
      VendorResponse vendor,
      LocalDate orderDate,
      LocalDate expectedDeliveryDate,
      PurchaseOrderStatus status,
      String notes,
      BigDecimal totalAmount,
      List<PurchaseOrderItemResponse> items,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record GoodsReceiptResponse(
      UUID id,
      String grnNumber,
      UUID purchaseOrderId,
      String poNumber,
      LocalDate receiptDate,
      UUID receivedBy,
      GoodsReceiptStatus status,
      String remarks,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record InvoiceResponse(
      UUID id,
      String invoiceNumber,
      UUID purchaseOrderId,
      String poNumber,
      VendorResponse vendor,
      LocalDate invoiceDate,
      LocalDate dueDate,
      BigDecimal amount,
      String matchingStatus,
      String matchingNotes,
      InvoiceStatus status,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record PaymentResponse(
      UUID id,
      String paymentNumber,
      UUID invoiceId,
      String invoiceNumber,
      VendorResponse vendor,
      LocalDate paymentDate,
      UUID requestedBy,
      UUID approvedBy,
      BigDecimal amount,
      PaymentStatus status,
      String remarks,
      Instant createdAt,
      Instant updatedAt
  ) {
  }
}
