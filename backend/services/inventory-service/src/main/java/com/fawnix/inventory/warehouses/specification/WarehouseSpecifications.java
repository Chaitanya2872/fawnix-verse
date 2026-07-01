package com.fawnix.inventory.warehouses.specification;

import com.fawnix.inventory.warehouses.entity.WarehouseEntity;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class WarehouseSpecifications {

  private WarehouseSpecifications() {
  }

  public static Specification<WarehouseEntity> withFilters(String search, Boolean active) {
    return (root, query, cb) -> {
      var predicate = cb.conjunction();
      if (search != null && !search.isBlank()) {
        String like = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
        predicate = cb.and(
            predicate,
            cb.or(
                cb.like(cb.lower(root.get("code")), like),
                cb.like(cb.lower(root.get("name")), like),
                cb.like(cb.lower(root.get("type")), like),
                cb.like(cb.lower(root.get("city")), like),
                cb.like(cb.lower(root.get("state")), like),
                cb.like(cb.lower(root.get("managerName")), like),
                cb.like(cb.lower(root.get("contactPhone")), like),
                cb.like(cb.lower(root.get("contactEmail")), like)
            )
        );
      }
      if (active != null) {
        predicate = cb.and(predicate, cb.equal(root.get("active"), active));
      }
      return predicate;
    };
  }
}
