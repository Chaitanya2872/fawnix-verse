package com.fawnix.inventory.products.service;

import com.fawnix.inventory.common.exception.BadRequestException;
import com.fawnix.inventory.common.exception.ResourceNotFoundException;
import com.fawnix.inventory.products.dto.ProductDtos;
import com.fawnix.inventory.products.entity.ProductEntity;
import com.fawnix.inventory.products.entity.ProductStatus;
import com.fawnix.inventory.products.repository.ProductRepository;
import com.fawnix.inventory.products.specification.ProductSpecifications;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
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
public class ProductService {

  private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

  private final ProductRepository productRepository;

  public ProductService(ProductRepository productRepository) {
    this.productRepository = productRepository;
  }

  @Transactional(readOnly = true)
  public ProductDtos.ProductListResponse getProducts(
      String search,
      String category,
      String status,
      int page,
      int pageSize
  ) {
    ProductStatus statusFilter = parseStatus(status);
    Specification<ProductEntity> specification = ProductSpecifications.withFilters(search, category, statusFilter);

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
        request.notes(), request.price(), request.stockQty());
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
    product.setPrice(scale(defaultMoney(price)));
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
