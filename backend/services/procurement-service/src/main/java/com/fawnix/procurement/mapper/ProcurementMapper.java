package com.fawnix.procurement.mapper;

import com.fawnix.procurement.domain.GoodsReceipt;
import com.fawnix.procurement.domain.Invoice;
import com.fawnix.procurement.domain.Payment;
import com.fawnix.procurement.domain.PurchaseOrder;
import com.fawnix.procurement.domain.PurchaseOrderItem;
import com.fawnix.procurement.domain.PurchaseRequisitionDocument;
import com.fawnix.procurement.domain.PurchaseRequisition;
import com.fawnix.procurement.domain.PurchaseRequisitionItem;
import com.fawnix.procurement.domain.VendorAddress;
import com.fawnix.procurement.domain.VendorBankAccount;
import com.fawnix.procurement.domain.VendorContactPerson;
import com.fawnix.procurement.domain.Vendor;
import com.fawnix.procurement.domain.VendorDocument;
import com.fawnix.procurement.dto.ProcurementDtos;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ProcurementMapper {

  public ProcurementDtos.PurchaseRequisitionResponse toPurchaseRequisitionResponse(
      PurchaseRequisition requisition,
      List<PurchaseRequisitionItem> items
  ) {
    List<ProcurementDtos.PurchaseRequisitionItemResponse> itemResponses = items.stream()
        .map(this::toPurchaseRequisitionItemResponse)
        .toList();

    BigDecimal subtotalAmount = items.stream()
        .map(item -> item.getEstimatedUnitPrice().multiply(item.getQuantity()))
        .reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal totalAmount = items.stream()
        .map(PurchaseRequisitionItem::getLineTotal)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal taxAmount = totalAmount.subtract(subtotalAmount);

    return new ProcurementDtos.PurchaseRequisitionResponse(
        requisition.getId(),
        requisition.getPrNumber(),
        requisition.getRequesterId(),
        requisition.getRequestType(),
        requisition.getDepartment(),
        requisition.getTitle(),
        requisition.getDescription(),
        requisition.getPurpose(),
        requisition.getNeededByDate(),
        requisition.getPriority(),
        requisition.getRequestCategory(),
        requisition.getStatus(),
        requisition.getCurrentStepOrder(),
        requisition.getSubmittedAt(),
        requisition.getApprovedAt(),
        requisition.getRejectedAt(),
        requisition.getRejectionReason(),
        requisition.getBudgetName(),
        requisition.getBudgetType(),
        requisition.getBudgetPeriod(),
        requisition.getAllocatedBudget(),
        requisition.getCommittedAmount(),
        requisition.getActualSpend(),
        requisition.getBudgetValidationNotes(),
        requisition.getBudgetExceptionJustification(),
        requisition.getEvaluationDecision(),
        requisition.getEvaluationNotes(),
        requisition.getEvaluationUpdatedAt(),
        requisition.getNegotiationVendorId(),
        requisition.getNegotiatedAmount(),
        requisition.getNegotiationDeliveryTimeline(),
        requisition.getNegotiationPaymentTerms(),
        requisition.getNegotiationDiscountPercent(),
        requisition.getNegotiationDiscountAmount(),
        requisition.getNegotiationNotes(),
        requisition.getNegotiationUpdatedAt(),
        subtotalAmount,
        taxAmount,
        totalAmount,
        itemResponses,
        requisition.getCreatedAt(),
        requisition.getUpdatedAt()
    );
  }

  public ProcurementDtos.PurchaseRequisitionItemResponse toPurchaseRequisitionItemResponse(PurchaseRequisitionItem item) {
    return new ProcurementDtos.PurchaseRequisitionItemResponse(
        item.getId(),
        item.getProductId(),
        item.getSku(),
        item.getProductName(),
        item.getCategory(),
        item.getUnit(),
        item.getQuantity(),
        item.getEstimatedUnitPrice(),
        item.getTaxPercent(),
        item.getLineTotal(),
        item.getRemarks(),
        item.getCreatedAt(),
        item.getUpdatedAt()
    );
  }

  public ProcurementDtos.VendorResponse toVendorResponse(Vendor vendor) {
    List<ProcurementDtos.VendorAddressResponse> shippingAddresses = vendor.getAddresses().stream()
        .filter(address -> address.getAddressType() == com.fawnix.procurement.domain.VendorAddressType.SHIPPING)
        .map(this::toVendorAddressResponse)
        .toList();
    ProcurementDtos.VendorAddressResponse billingAddress = vendor.getAddresses().stream()
        .filter(address -> address.getAddressType() == com.fawnix.procurement.domain.VendorAddressType.BILLING)
        .findFirst()
        .map(this::toVendorAddressResponse)
        .orElse(null);

    return new ProcurementDtos.VendorResponse(
        vendor.getId(),
        vendor.getVendorCode(),
        vendor.getVendorName(),
        vendor.getVendorType(),
        vendor.getSalutation(),
        vendor.getFirstName(),
        vendor.getLastName(),
        vendor.getCompanyName(),
        vendor.getVendorName(),
        vendor.getEmail(),
        vendor.getPhone(),
        vendor.getWorkPhone(),
        vendor.getMobile(),
        vendor.getVendorLanguage(),
        vendor.getGstNumber(),
        vendor.getPanNumber(),
        vendor.getWebsite(),
        vendor.getStatus(),
        vendor.getRemarks(),
        vendor.getGstNumber(),
        billingAddress != null ? billingAddress.addressLine1() : null,
        billingAddress != null ? billingAddress.addressLine2() : null,
        billingAddress != null ? billingAddress.city() : null,
        billingAddress != null ? billingAddress.state() : null,
        billingAddress != null ? billingAddress.country() : null,
        billingAddress != null ? billingAddress.postalCode() : null,
        billingAddress,
        shippingAddresses,
        vendor.getContactPersons().stream().map(this::toVendorContactPersonResponse).toList(),
        vendor.getBankAccounts().stream().map(this::toVendorBankAccountResponse).toList(),
        vendor.getCreatedAt(),
        vendor.getUpdatedAt()
    );
  }

  public ProcurementDtos.VendorAddressResponse toVendorAddressResponse(VendorAddress address) {
    return new ProcurementDtos.VendorAddressResponse(
        address.getId(),
        address.getAddressType(),
        address.getLabel(),
        address.getAttention(),
        address.getAddressLine1(),
        address.getAddressLine2(),
        address.getCity(),
        address.getState(),
        address.getCountry(),
        address.getPostalCode(),
        address.isPrimaryAddress(),
        address.getCreatedAt(),
        address.getUpdatedAt()
    );
  }

  public ProcurementDtos.VendorContactPersonResponse toVendorContactPersonResponse(VendorContactPerson contactPerson) {
    return new ProcurementDtos.VendorContactPersonResponse(
        contactPerson.getId(),
        contactPerson.getSalutation(),
        contactPerson.getFirstName(),
        contactPerson.getLastName(),
        contactPerson.getEmail(),
        contactPerson.getWorkPhone(),
        contactPerson.getMobile(),
        contactPerson.getSkypeName(),
        contactPerson.getDesignation(),
        contactPerson.getDepartment(),
        contactPerson.isPrimaryContact(),
        contactPerson.getCreatedAt(),
        contactPerson.getUpdatedAt()
    );
  }

  public ProcurementDtos.VendorBankAccountResponse toVendorBankAccountResponse(VendorBankAccount bankAccount) {
    return new ProcurementDtos.VendorBankAccountResponse(
        bankAccount.getId(),
        bankAccount.getAccountHolderName(),
        bankAccount.getBankName(),
        maskAccountNumber(bankAccount.getAccountNumber()),
        bankAccount.getIfscCode(),
        bankAccount.getBranchName(),
        bankAccount.getUpiId(),
        bankAccount.getAccountType(),
        bankAccount.isPrimaryAccount(),
        bankAccount.getCreatedAt(),
        bankAccount.getUpdatedAt()
    );
  }

  private String maskAccountNumber(String value) {
    if (value == null || value.length() <= 4) {
      return value;
    }
    return "*".repeat(Math.max(0, value.length() - 4)) + value.substring(value.length() - 4);
  }

  public ProcurementDtos.VendorDocumentResponse toVendorDocumentResponse(VendorDocument vendorDocument) {
    return new ProcurementDtos.VendorDocumentResponse(
        vendorDocument.getId(),
        vendorDocument.getFileName(),
        vendorDocument.getContentType(),
        vendorDocument.getFileSize(),
        vendorDocument.getCreatedAt(),
        vendorDocument.getUpdatedAt()
    );
  }

  public ProcurementDtos.PurchaseRequisitionDocumentResponse toPurchaseRequisitionDocumentResponse(
      PurchaseRequisitionDocument document
  ) {
    return new ProcurementDtos.PurchaseRequisitionDocumentResponse(
        document.getId(),
        document.getDocumentType(),
        document.getFileName(),
        document.getContentType(),
        document.getFileSize(),
        document.getCreatedAt(),
        document.getUpdatedAt()
    );
  }

  public ProcurementDtos.PurchaseOrderResponse toPurchaseOrderResponse(
      PurchaseOrder purchaseOrder,
      List<PurchaseOrderItem> items
  ) {
    List<ProcurementDtos.PurchaseOrderItemResponse> itemResponses = items.stream()
        .map(this::toPurchaseOrderItemResponse)
        .toList();

    return new ProcurementDtos.PurchaseOrderResponse(
        purchaseOrder.getId(),
        purchaseOrder.getPoNumber(),
        purchaseOrder.getPurchaseRequisition().getId(),
        purchaseOrder.getPurchaseRequisition().getPrNumber(),
        toVendorResponse(purchaseOrder.getVendor()),
        purchaseOrder.getOrderDate(),
        purchaseOrder.getExpectedDeliveryDate(),
        purchaseOrder.getStatus(),
        purchaseOrder.getNotes(),
        purchaseOrder.getTotalAmount(),
        itemResponses,
        purchaseOrder.getCreatedAt(),
        purchaseOrder.getUpdatedAt()
    );
  }

  public ProcurementDtos.PurchaseOrderItemResponse toPurchaseOrderItemResponse(PurchaseOrderItem item) {
    return new ProcurementDtos.PurchaseOrderItemResponse(
        item.getId(),
        item.getProductId(),
        item.getSku(),
        item.getProductName(),
        item.getCategory(),
        item.getUnit(),
        item.getQuantity(),
        item.getUnitPrice(),
        item.getLineTotal(),
        item.getCreatedAt(),
        item.getUpdatedAt()
    );
  }

  public ProcurementDtos.GoodsReceiptResponse toGoodsReceiptResponse(GoodsReceipt receipt) {
    return new ProcurementDtos.GoodsReceiptResponse(
        receipt.getId(),
        receipt.getGrnNumber(),
        receipt.getPurchaseOrder().getId(),
        receipt.getPurchaseOrder().getPoNumber(),
        receipt.getReceiptDate(),
        receipt.getReceivedBy(),
        receipt.getStatus(),
        receipt.getRemarks(),
        receipt.getCreatedAt(),
        receipt.getUpdatedAt()
    );
  }

  public ProcurementDtos.InvoiceResponse toInvoiceResponse(
      Invoice invoice,
      String matchingStatus,
      String matchingNotes
  ) {
    return new ProcurementDtos.InvoiceResponse(
        invoice.getId(),
        invoice.getInvoiceNumber(),
        invoice.getPurchaseOrder().getId(),
        invoice.getPurchaseOrder().getPoNumber(),
        toVendorResponse(invoice.getVendor()),
        invoice.getInvoiceDate(),
        invoice.getDueDate(),
        invoice.getAmount(),
        matchingStatus,
        matchingNotes,
        invoice.getStatus(),
        invoice.getCreatedAt(),
        invoice.getUpdatedAt()
    );
  }

  public ProcurementDtos.PaymentResponse toPaymentResponse(Payment payment) {
    return new ProcurementDtos.PaymentResponse(
        payment.getId(),
        payment.getPaymentNumber(),
        payment.getInvoice().getId(),
        payment.getInvoice().getInvoiceNumber(),
        toVendorResponse(payment.getInvoice().getVendor()),
        payment.getPaymentDate(),
        payment.getRequestedBy(),
        payment.getApprovedBy(),
        payment.getAmount(),
        payment.getStatus(),
        payment.getRemarks(),
        payment.getCreatedAt(),
        payment.getUpdatedAt()
    );
  }
}
