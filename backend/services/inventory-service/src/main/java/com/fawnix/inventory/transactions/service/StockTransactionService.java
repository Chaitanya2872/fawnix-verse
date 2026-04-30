package com.fawnix.inventory.transactions.service;

import com.fawnix.inventory.common.exception.BadRequestException;
import com.fawnix.inventory.common.exception.ResourceNotFoundException;
import com.fawnix.inventory.products.entity.ProductEntity;
import com.fawnix.inventory.products.repository.ProductRepository;
import com.fawnix.inventory.products.service.ProductService;
import com.fawnix.inventory.transactions.dto.TransactionDtos;
import com.fawnix.inventory.transactions.entity.StockTransactionEntity;
import com.fawnix.inventory.transactions.entity.TransactionType;
import com.fawnix.inventory.transactions.repository.StockTransactionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StockTransactionService {

  private final StockTransactionRepository transactionRepository;
  private final ProductRepository productRepository;
  private final ProductService productService;

  public StockTransactionService(
      StockTransactionRepository transactionRepository,
      ProductRepository productRepository,
      ProductService productService
  ) {
    this.transactionRepository = transactionRepository;
    this.productRepository = productRepository;
    this.productService = productService;
  }

  @Transactional(readOnly = true)
  public TransactionDtos.TransactionListResponse listTransactions(String sku) {
    List<StockTransactionEntity> transactions;
    if (sku == null || sku.isBlank()) {
      transactions = transactionRepository.findAllByOrderByTxnDateDescCreatedAtDesc();
    } else {
      ProductEntity product = productRepository.findBySku(sku.trim())
          .orElseThrow(() -> new ResourceNotFoundException("Product not found."));
      transactions = transactionRepository.findByProduct_IdOrderByTxnDateDescCreatedAtDesc(product.getId());
    }

    List<TransactionDtos.TransactionResponse> data = transactions.stream()
        .map(this::toResponse)
        .toList();

    return new TransactionDtos.TransactionListResponse(data);
  }

  @Transactional
  public TransactionDtos.TransactionResponse createTransaction(TransactionDtos.CreateTransactionRequest request) {
    ProductEntity product = productRepository.findBySku(request.sku().trim())
        .orElseThrow(() -> new ResourceNotFoundException("Product not found."));

    StockTransactionEntity entity = buildTransaction(
        product,
        request.txnRef().trim(),
        request.txnDate(),
        request.txnType(),
        request.vendorName().trim(),
        request.quantity(),
        request.unitPrice(),
        request.projectRef(),
        request.issuedBy(),
        request.notes()
    );

    BigDecimal delta = resolveDelta(request.txnType(), entity.getQuantity());
    if (delta.compareTo(BigDecimal.ZERO) == 0) {
      throw new BadRequestException("Quantity must be greater than zero.");
    }

    productService.applyStockAdjustment(product, delta);
    return toResponse(transactionRepository.save(entity));
  }

  @Transactional
  public TransactionDtos.TransactionResponse receiveStock(String productId, TransactionDtos.StockAdjustmentRequest request) {
    ProductEntity product = productRepository.findById(productId)
        .orElseThrow(() -> new ResourceNotFoundException("Product not found."));

    StockTransactionEntity entity = buildTransaction(
        product,
        "RCV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
        request.txnDate(),
        TransactionType.RECEIVED,
        String.valueOf(trimToDefault(request.vendorName(), "Manual Receipt")),
        request.quantity(),
        product.getPrice(),
        request.projectRef(),
        request.issuedBy(),
        request.notes()
    );

    productService.applyStockAdjustment(product, resolveDelta(entity.getTxnType(), entity.getQuantity()));
    return toResponse(transactionRepository.save(entity));
  }

  @Transactional
  public TransactionDtos.TransactionResponse consumeStock(String productId, TransactionDtos.StockAdjustmentRequest request) {
    ProductEntity product = productRepository.findById(productId)
        .orElseThrow(() -> new ResourceNotFoundException("Product not found."));

    StockTransactionEntity entity = buildTransaction(
        product,
        "CON-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
        request.txnDate(),
        TransactionType.CONSUMED,
        "Internal Consumption",
        request.quantity(),
        product.getPrice(),
        request.projectRef(),
        request.issuedBy(),
        request.notes()
    );

    productService.applyStockAdjustment(product, resolveDelta(entity.getTxnType(), entity.getQuantity()));
    return toResponse(transactionRepository.save(entity));
  }

  private TransactionDtos.TransactionResponse toResponse(StockTransactionEntity entity) {
    return new TransactionDtos.TransactionResponse(
        entity.getId(),
        entity.getProduct().getSku(),
        entity.getProduct().getName(),
        entity.getTxnRef(),
        entity.getTxnDate(),
        entity.getTxnType(),
        entity.getVendorName(),
        entity.getQuantity(),
        entity.getUnitPrice(),
        entity.getLineTotal(),
        entity.getProjectRef(),
        entity.getIssuedBy(),
        entity.getNotes(),
        entity.getCreatedAt()
    );
  }

  private BigDecimal calculateLineTotal(BigDecimal quantity, BigDecimal unitPrice) {
    if (unitPrice == null) {
      return null;
    }
    return quantity.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal scale(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal scaleOrNull(BigDecimal value) {
    if (value == null) {
      return null;
    }
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private String trimToDefault(String value, String fallback) {
    String trimmed = trimToNull(value);
    return trimmed != null ? trimmed : fallback;
  }

  private BigDecimal resolveDelta(TransactionType txnType, BigDecimal quantity) {
    return switch (txnType) {
      case INWARD, OPENING, RECEIVED -> quantity;
      case OUTWARD, CONSUMED -> quantity.negate();
    };
  }

  private StockTransactionEntity buildTransaction(
      ProductEntity product,
      String txnRef,
      java.time.LocalDate txnDate,
      TransactionType txnType,
      String vendorName,
      BigDecimal quantity,
      BigDecimal unitPrice,
      String projectRef,
      String issuedBy,
      String notes
  ) {
    StockTransactionEntity entity = new StockTransactionEntity();
    entity.setId(UUID.randomUUID().toString());
    entity.setProduct(product);
    entity.setTxnRef(txnRef);
    entity.setTxnDate(txnDate);
    entity.setTxnType(txnType);
    entity.setVendorName(vendorName);
    entity.setQuantity(scale(quantity));
    entity.setUnitPrice(scaleOrNull(unitPrice));
    entity.setLineTotal(calculateLineTotal(entity.getQuantity(), entity.getUnitPrice()));
    entity.setProjectRef(trimToNull(projectRef));
    entity.setIssuedBy(trimToNull(issuedBy));
    entity.setNotes(trimToNull(notes));
    entity.setCreatedAt(Instant.now());
    return entity;
  }
}
