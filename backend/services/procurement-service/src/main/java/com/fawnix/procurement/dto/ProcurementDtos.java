package com.fawnix.procurement.dto;

import com.fawnix.procurement.domain.ApprovalAction;
import com.fawnix.procurement.domain.GoodsReceiptStatus;
import com.fawnix.procurement.domain.PurchaseOrderStatus;
import com.fawnix.procurement.domain.PurchaseRequisitionStatus;
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
      @NotBlank(message = "Department is required.")
      String department,
      String purpose,
      LocalDate neededByDate,
      @NotEmpty(message = "At least one PR item is required.")
      List<@Valid PurchaseRequisitionItemRequest> items
  ) {
  }

  public record PurchaseRequisitionItemRequest(
      @NotNull(message = "Product ID is required.")
      UUID productId,
      @NotNull(message = "Quantity is required.")
      @DecimalMin(value = "0.01", message = "Quantity must be greater than 0.")
      BigDecimal quantity,
      String remarks
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
      String department,
      String purpose,
      LocalDate neededByDate,
      PurchaseRequisitionStatus status,
      Integer currentStepOrder,
      Instant submittedAt,
      Instant approvedAt,
      Instant rejectedAt,
      String rejectionReason,
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
}
