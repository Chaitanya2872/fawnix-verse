package com.fawnix.inventory.products.specification;

import com.fawnix.inventory.products.entity.ProductEntity;
import com.fawnix.inventory.products.entity.ProductStatus;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class ProductSpecifications {

  private ProductSpecifications() {
  }

  public static Specification<ProductEntity> withFilters(
      String search,
      String category,
      String brand,
      ProductStatus status
  ) {
    return (root, query, cb) -> {
      var predicate = cb.conjunction();
      if (search != null && !search.isBlank()) {
        String like = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
        predicate = cb.and(
            predicate,
            cb.or(
                cb.like(cb.lower(root.get("name")), like),
                cb.like(cb.lower(root.get("sku")), like),
                cb.like(cb.lower(root.get("brand")), like)
            )
        );
      }
      if (category != null && !category.isBlank()) {
        predicate = cb.and(predicate, cb.equal(cb.lower(root.get("category")), category.trim().toLowerCase(Locale.ROOT)));
      }
      if (brand != null && !brand.isBlank()) {
        predicate = cb.and(predicate, cb.equal(cb.lower(root.get("brand")), brand.trim().toLowerCase(Locale.ROOT)));
      }
      if (status != null) {
        predicate = cb.and(predicate, cb.equal(root.get("status"), status));
      }
      return predicate;
    };
  }
}
