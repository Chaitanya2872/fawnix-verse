package com.fawnix.sales.orders.specification;

import com.fawnix.sales.orders.entity.SalesOrderEntity;
import com.fawnix.sales.orders.entity.SalesOrderStatus;
import org.springframework.data.jpa.domain.Specification;

public final class SalesOrderSpecifications {

  private SalesOrderSpecifications() {
  }

  public static Specification<SalesOrderEntity> withSearch(String search) {
    return (root, query, cb) -> {
      if (search == null || search.isBlank()) {
        return cb.conjunction();
      }
      String pattern = "%" + search.trim().toLowerCase() + "%";
      return cb.or(
          cb.like(cb.lower(root.get("orderNumber")), pattern),
          cb.like(cb.lower(root.get("customerName")), pattern),
          cb.like(cb.lower(root.get("company")), pattern)
      );
    };
  }

  public static Specification<SalesOrderEntity> withStatus(SalesOrderStatus status) {
    return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
  }
}
