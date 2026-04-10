package com.fawnix.inventory.products.service;

import com.fawnix.inventory.common.exception.BadRequestException;
import com.fawnix.inventory.common.exception.ResourceNotFoundException;
import com.fawnix.inventory.products.dto.InventoryOverviewDtos;
import com.fawnix.inventory.products.dto.ProductDtos;
import com.fawnix.inventory.products.entity.ProductEntity;
import com.fawnix.inventory.products.entity.ProductStatus;
import com.fawnix.inventory.products.repository.ProductRepository;
import com.fawnix.inventory.products.specification.ProductSpecifications;
import com.fawnix.inventory.transactions.entity.StockTransactionEntity;
import com.fawnix.inventory.transactions.entity.TransactionType;
import com.fawnix.inventory.transactions.repository.StockTransactionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

  private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

  private final ProductRepository productRepository;
  private final StockTransactionRepository stockTransactionRepository;

  public ProductService(
      ProductRepository productRepository,
      StockTransactionRepository stockTransactionRepository
  ) {
    this.productRepository = productRepository;
    this.stockTransactionRepository = stockTransactionRepository;
  }

  @Transactional(readOnly = true)
  public ProductDtos.ProductListResponse getProducts(
      String search,
      String category,
      String brand,
      String status,
      int page,
      int pageSize
  ) {
    ProductStatus statusFilter = parseStatus(status);
    Specification<ProductEntity> specification = ProductSpecifications.withFilters(search, category, brand, statusFilter);

    int resolvedPage = Math.max(page, 1);
    int resolvedPageSize = Math.max(pageSize, 1);
    Page<ProductEntity> result = productRepository.findAll(
        specification,
        PageRequest.of(resolvedPage - 1, resolvedPageSize, Sort.by(Sort.Direction.ASC, "name"))
    );

    List<ProductDtos.ProductResponse> data = result.getContent().stream()
        .map(this::toResponse)
        .toList();

    return new ProductDtos.ProductListResponse(
        data,
        result.getTotalElements(),
        resolvedPage,
        resolvedPageSize,
        result.getTotalPages()
    );
  }

  @Transactional(readOnly = true)
  public InventoryOverviewDtos.InventoryOverviewResponse getOverview() {
    List<ProductEntity> products = productRepository.findAll(Sort.by(Sort.Direction.ASC, "category").and(Sort.by(Sort.Direction.ASC, "name")));
    List<StockTransactionEntity> outwardTransactions = stockTransactionRepository.findAll().stream()
        .filter(transaction -> transaction.getTxnType() == TransactionType.OUTWARD)
        .sorted(Comparator.comparing(StockTransactionEntity::getTxnDate).reversed()
            .thenComparing(StockTransactionEntity::getCreatedAt, Comparator.reverseOrder()))
        .toList();

    Map<String, List<ProductEntity>> byCategory = products.stream()
        .collect(Collectors.groupingBy(ProductEntity::getCategory));

    List<InventoryOverviewDtos.CategorySummary> categories = byCategory.entrySet().stream()
        .map(entry -> {
          List<ProductEntity> categoryProducts = entry.getValue();
          return new InventoryOverviewDtos.CategorySummary(
              entry.getKey(),
              categoryProducts.size(),
              categoryProducts.stream().map(ProductEntity::getBrand).filter(Objects::nonNull).map(String::trim).filter(value -> !value.isEmpty()).distinct().count(),
              sumProductStock(categoryProducts),
              categoryProducts.stream().filter(product -> product.getStatus() == ProductStatus.LOW_STOCK).count(),
              categoryProducts.stream().filter(product -> product.getStatus() == ProductStatus.OUT_OF_STOCK).count()
          );
        })
        .sorted(Comparator.comparing(InventoryOverviewDtos.CategorySummary::category))
        .toList();

    List<InventoryOverviewDtos.BrandSummary> brands = products.stream()
        .filter(product -> product.getBrand() != null && !product.getBrand().isBlank())
        .collect(Collectors.groupingBy(product -> product.getBrand().trim()))
        .entrySet().stream()
        .map(entry -> {
          List<ProductEntity> brandProducts = entry.getValue();
          return new InventoryOverviewDtos.BrandSummary(
              entry.getKey(),
              brandProducts.size(),
              brandProducts.stream().map(ProductEntity::getCategory).distinct().count(),
              sumProductStock(brandProducts)
          );
        })
        .sorted(Comparator.comparing(InventoryOverviewDtos.BrandSummary::productCount).reversed()
            .thenComparing(InventoryOverviewDtos.BrandSummary::brand))
        .toList();

    BigDecimal consumedQuantity = outwardTransactions.stream()
        .map(StockTransactionEntity::getQuantity)
        .reduce(ZERO, BigDecimal::add);
    LocalDate lastConsumedOn = outwardTransactions.stream()
        .map(StockTransactionEntity::getTxnDate)
        .max(LocalDate::compareTo)
        .orElse(null);

    List<InventoryOverviewDtos.ConsumptionItem> recentConsumption = outwardTransactions.stream()
        .limit(12)
        .map(transaction -> new InventoryOverviewDtos.ConsumptionItem(
            transaction.getId(),
            transaction.getProduct().getSku(),
            transaction.getProduct().getName(),
            transaction.getProduct().getCategory(),
            transaction.getProduct().getBrand(),
            transaction.getTxnDate(),
            transaction.getQuantity(),
            transaction.getProjectRef(),
            transaction.getIssuedBy(),
            transaction.getNotes()
        ))
        .toList();

    return new InventoryOverviewDtos.InventoryOverviewResponse(
        products.size(),
        categories.size(),
        brands.size(),
        sumProductStock(products),
        categories,
        brands,
        new InventoryOverviewDtos.ConsumptionSummary(
            outwardTransactions.size(),
            consumedQuantity,
            lastConsumedOn
        ),
        recentConsumption
    );
  }

  @Transactional(readOnly = true)
  public ProductDtos.ProductResponse getProduct(String id) {
    return toResponse(requireProduct(id));
  }

  @Transactional
  public ProductDtos.ProductResponse createProduct(ProductDtos.CreateProductRequest request) {
    if (productRepository.existsBySku(request.sku().trim())) {
      throw new BadRequestException("SKU already exists.");
    }
    Instant now = Instant.now();
    ProductEntity product = new ProductEntity();
    product.setId(UUID.randomUUID().toString());
    applyFields(product, request.sku(), request.name(), request.category(),
        request.subCategory(), request.brand(), request.unit(),
        request.reorderLevel(), request.description(), request.hsnCode(),
        request.notes(), request.price(), request.priceTier1(), request.priceTier2(),
        request.priceTier3(), request.stockQty());
    product.setCreatedAt(now);
    product.setUpdatedAt(now);
    return toResponse(productRepository.save(product));
  }

  @Transactional
  public ProductDtos.ProductResponse updateProduct(String id, ProductDtos.UpdateProductRequest request) {
    ProductEntity product = requireProduct(id);
    if (request.sku() != null && !request.sku().trim().equalsIgnoreCase(product.getSku())) {
      if (productRepository.existsBySku(request.sku().trim())) {
        throw new BadRequestException("SKU already exists.");
      }
      product.setSku(request.sku().trim());
    }
    if (request.name() != null) {
      product.setName(request.name().trim());
    }
    if (request.category() != null) {
      product.setCategory(request.category().trim());
    }
    if (request.subCategory() != null) {
      product.setSubCategory(trimToNull(request.subCategory()));
    }
    if (request.brand() != null) {
      product.setBrand(trimToNull(request.brand()));
    }
    if (request.unit() != null) {
      product.setUnit(normalizeUnit(request.unit()));
    }
    if (request.reorderLevel() != null) {
      product.setReorderLevel(scale(request.reorderLevel()));
    }
    if (request.description() != null) {
      product.setDescription(trimToNull(request.description()));
    }
    if (request.hsnCode() != null) {
      product.setHsnCode(trimToNull(request.hsnCode()));
    }
    if (request.notes() != null) {
      product.setNotes(trimToNull(request.notes()));
    }
    if (request.price() != null) {
      product.setPrice(scale(request.price()));
    }
    if (request.priceTier1() != null) {
      product.setPriceTier1(scale(request.priceTier1()));
    }
    if (request.priceTier2() != null) {
      product.setPriceTier2(scale(request.priceTier2()));
    }
    if (request.priceTier3() != null) {
      product.setPriceTier3(scale(request.priceTier3()));
    }
    if (request.stockQty() != null) {
      product.setStockQty(scale(request.stockQty()));
    }

    product.setStatus(resolveStatus(product.getStockQty(), product.getReorderLevel()));
    product.setUpdatedAt(Instant.now());
    return toResponse(productRepository.save(product));
  }

  @Transactional
  public void deleteProduct(String id) {
    ProductEntity product = requireProduct(id);
    productRepository.delete(product);
  }

  @Transactional
  public void applyStockAdjustment(ProductEntity product, BigDecimal delta) {
    BigDecimal updated = product.getStockQty().add(delta);
    if (updated.compareTo(BigDecimal.ZERO) < 0) {
      throw new BadRequestException("Stock quantity cannot be negative.");
    }
    product.setStockQty(scale(updated));
    product.setStatus(resolveStatus(product.getStockQty(), product.getReorderLevel()));
    product.setUpdatedAt(Instant.now());
    productRepository.save(product);
  }

  private void applyFields(
      ProductEntity product,
      String sku,
      String name,
      String category,
      String subCategory,
      String brand,
      String unit,
      BigDecimal reorderLevel,
      String description,
      String hsnCode,
      String notes,
      BigDecimal price,
      BigDecimal priceTier1,
      BigDecimal priceTier2,
      BigDecimal priceTier3,
      BigDecimal stockQty
  ) {
    product.setSku(sku.trim());
    product.setName(name.trim());
    product.setCategory(category.trim());
    product.setSubCategory(trimToNull(subCategory));
    product.setBrand(trimToNull(brand));
    product.setUnit(normalizeUnit(unit));
    product.setReorderLevel(scale(defaultMoney(reorderLevel)));
    product.setDescription(trimToNull(description));
    product.setHsnCode(trimToNull(hsnCode));
    product.setNotes(trimToNull(notes));
    product.setPrice(scale(resolveEffectivePrice(price, priceTier1, priceTier2, priceTier3)));
    product.setPriceTier1(scaleNullable(priceTier1));
    product.setPriceTier2(scaleNullable(priceTier2));
    product.setPriceTier3(scaleNullable(priceTier3));
    product.setStockQty(scale(defaultMoney(stockQty)));
    product.setStatus(resolveStatus(product.getStockQty(), product.getReorderLevel()));
  }

  private ProductDtos.ProductResponse toResponse(ProductEntity product) {
    return new ProductDtos.ProductResponse(
        product.getId(),
        product.getSku(),
        product.getName(),
        product.getCategory(),
        product.getSubCategory(),
        product.getBrand(),
        product.getUnit(),
        product.getReorderLevel(),
        product.getDescription(),
        product.getHsnCode(),
        product.getNotes(),
        product.getPrice(),
        product.getPriceTier1(),
        product.getPriceTier2(),
        product.getPriceTier3(),
        product.getStockQty(),
        product.getStatus(),
        product.getCreatedAt(),
        product.getUpdatedAt()
    );
  }

  private ProductEntity requireProduct(String id) {
    return productRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Product not found."));
  }

  private ProductStatus parseStatus(String value) {
    if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value)) {
      return null;
    }
    try {
      return ProductStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw new BadRequestException("Invalid status.");
    }
  }

  private BigDecimal sumProductStock(List<ProductEntity> products) {
    return products.stream()
        .map(ProductEntity::getStockQty)
        .filter(Objects::nonNull)
        .reduce(ZERO, BigDecimal::add);
  }

  private ProductStatus resolveStatus(BigDecimal stockQty, BigDecimal reorderLevel) {
    BigDecimal qty = defaultMoney(stockQty);
    BigDecimal threshold = defaultMoney(reorderLevel);
    if (qty.compareTo(BigDecimal.ZERO) <= 0) {
      return ProductStatus.OUT_OF_STOCK;
    }
    if (threshold.compareTo(BigDecimal.ZERO) > 0 && qty.compareTo(threshold) <= 0) {
      return ProductStatus.LOW_STOCK;
    }
    return ProductStatus.IN_STOCK;
  }

  private BigDecimal defaultMoney(BigDecimal value) {
    if (value == null) {
      return ZERO;
    }
    return value;
  }

  private BigDecimal scale(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal scaleNullable(BigDecimal value) {
    if (value == null) {
      return null;
    }
    return scale(value);
  }

  private BigDecimal resolveEffectivePrice(
      BigDecimal explicitPrice,
      BigDecimal priceTier1,
      BigDecimal priceTier2,
      BigDecimal priceTier3
  ) {
    if (explicitPrice != null) {
      return explicitPrice;
    }
    if (priceTier1 != null) {
      return priceTier1;
    }
    if (priceTier2 != null) {
      return priceTier2;
    }
    if (priceTier3 != null) {
      return priceTier3;
    }
    return ZERO;
  }

  private String normalizeUnit(String unit) {
    if (unit == null || unit.isBlank()) {
      return "pcs";
    }
    return unit.trim().toLowerCase(Locale.ROOT);
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
