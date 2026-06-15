package com.fawnix.sales.orders.dto;

import com.fawnix.sales.orders.entity.SalesOrderStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class SalesOrderDtos {

  private SalesOrderDtos() {
  }

  public record SalesOrderItemRequest(
      String inventoryProductId,
      @NotBlank(message = "Item name is required.")
      String name,
      String make,
      String description,
      String utility,
      @NotNull(message = "Quantity is required.")
      @DecimalMin(value = "0.01", message = "Quantity must be greater than 0.")
      BigDecimal quantity,
      String unit,
      @NotNull(message = "Unit price is required.")
      @DecimalMin(value = "0.00", message = "Unit price must be at least 0.")
      BigDecimal unitPrice
  ) {
  }

  public record CreateSalesOrderRequest(
      String quoteId,
      String leadId,
      @NotBlank(message = "Customer name is required.")
      String customerName,
      String company,
      String email,
      String phone,
      String billingAddress,
      String shippingAddress,
      String currency,
      SalesOrderStatus status,
      LocalDate deliveryDate,
      String paymentTerms,
      String customerPoNumber,
      String quotationReference,
      @Min(value = 0, message = "Payment due days must be 0 or more.")
      Integer paymentDueDays,
      BigDecimal taxRate,
      BigDecimal discountPercent,
      BigDecimal customerCreditLimit,
      BigDecimal customerOutstandingAmount,
      String confirmationAttachmentUrl,
      String notes,
      @NotEmpty(message = "At least one line item is required.")
      @Valid
      List<SalesOrderItemRequest> items
  ) {
  }

  public record UpdateSalesOrderRequest(
      String customerName,
      String company,
      String email,
      String phone,
      String billingAddress,
      String shippingAddress,
      String currency,
      LocalDate deliveryDate,
      String paymentTerms,
      String customerPoNumber,
      String quotationReference,
      @Min(value = 0, message = "Payment due days must be 0 or more.")
      Integer paymentDueDays,
      BigDecimal taxRate,
      BigDecimal discountPercent,
      BigDecimal customerCreditLimit,
      BigDecimal customerOutstandingAmount,
      String confirmationAttachmentUrl,
      String notes,
      @Valid
      List<SalesOrderItemRequest> items
  ) {
  }

  public record UpdateSalesOrderStatusRequest(
      @NotNull(message = "Status is required.")
      SalesOrderStatus status,
      String remarks
  ) {
  }

  public record ApprovalActionRequest(
      @NotBlank(message = "Action is required.")
      String action,
      String roleKey,
      String roleLabel,
      String remarks
  ) {
  }

  public record ConfirmSalesOrderRequest(
      String confirmationAttachmentUrl,
      String remarks
  ) {
  }

  public record SalesOrderValidationSnapshot(
      boolean stockAvailable,
      boolean creditLimitExceeded,
      boolean duplicateOrder,
      boolean riskyPaymentTerms,
      boolean specialDiscount,
      String summary,
      Instant validatedAt
  ) {
  }

  public record SalesOrderApprovalRuleRequest(
      @NotBlank(message = "Role key is required.")
      String roleKey,
      @NotBlank(message = "Role label is required.")
      String roleLabel,
      @Min(value = 1, message = "Sequence must start from 1.")
      int sequenceNo,
      BigDecimal minOrderValue,
      BigDecimal maxOrderValue,
      boolean requireCreditLimitBreach,
      boolean requireInventoryShortage,
      boolean requireRiskyTerms,
      boolean requireSpecialDiscount,
      boolean active
  ) {
  }

  public record SalesOrderApprovalRuleResponse(
      String id,
      String roleKey,
      String roleLabel,
      int sequenceNo,
      BigDecimal minOrderValue,
      BigDecimal maxOrderValue,
      boolean requireCreditLimitBreach,
      boolean requireInventoryShortage,
      boolean requireRiskyTerms,
      boolean requireSpecialDiscount,
      boolean active
  ) {
  }

  public record SalesOrderApprovalResponse(
      String id,
      String roleKey,
      String roleLabel,
      int sequenceNo,
      String status,
      String remarks,
      String approverName,
      Instant createdAt,
      Instant decidedAt
  ) {
  }

  public record SalesOrderAuditLogResponse(
      String id,
      String actionType,
      String actorName,
      String details,
      Instant createdAt
  ) {
  }

  public record SalesOrderItemResponse(
      String id,
      String inventoryProductId,
      String name,
      String make,
      String description,
      String utility,
      BigDecimal quantity,
      String unit,
      BigDecimal unitPrice,
      BigDecimal lineTotal
  ) {
  }

  public record SalesOrderResponse(
      String id,
      String orderNumber,
      String quoteId,
      String leadId,
      SalesOrderStatus status,
      String customerName,
      String company,
      String email,
      String phone,
      String billingAddress,
      String shippingAddress,
      String currency,
      LocalDate deliveryDate,
      String paymentTerms,
      String customerPoNumber,
      String quotationReference,
      Integer paymentDueDays,
      BigDecimal subtotal,
      BigDecimal taxRate,
      BigDecimal taxTotal,
      BigDecimal discountPercent,
      BigDecimal discountAmount,
      BigDecimal total,
      BigDecimal customerCreditLimit,
      BigDecimal customerOutstandingAmount,
      boolean creditLimitExceeded,
      boolean stockAvailable,
      boolean duplicateOrderFlag,
      boolean riskyPaymentTerms,
      boolean specialDiscountFlag,
      SalesOrderValidationSnapshot validation,
      Instant submittedAt,
      Instant confirmedAt,
      String confirmedByName,
      String confirmationAttachmentUrl,
      boolean inventoryReserved,
      String inventoryReservationMessage,
      Instant inventoryReservedAt,
      List<SalesOrderApprovalResponse> approvals,
      List<SalesOrderAuditLogResponse> auditLogs,
      String notes,
      List<SalesOrderItemResponse> items,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record SalesOrderSummary(
      String id,
      String orderNumber,
      String quoteId,
      SalesOrderStatus status,
      String customerName,
      String company,
      BigDecimal total,
      String paymentTerms,
      LocalDate deliveryDate,
      boolean creditLimitExceeded,
      boolean stockAvailable,
      boolean inventoryReserved,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record SalesOrderListResponse(
      List<SalesOrderSummary> data,
      long total,
      int page,
      int pageSize,
      int totalPages
  ) {
  }
}
