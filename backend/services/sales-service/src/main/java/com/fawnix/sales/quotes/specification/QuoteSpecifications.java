package com.fawnix.sales.quotes.specification;

import com.fawnix.sales.quotes.entity.QuoteEntity;
import com.fawnix.sales.quotes.entity.QuoteStatus;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class QuoteSpecifications {

  private QuoteSpecifications() {
  }

  public static Specification<QuoteEntity> withFilters(String search, QuoteStatus status) {
    return Specification.where(search(search))
        .and(status(status));
  }

  private static Specification<QuoteEntity> search(String search) {
    if (search == null || search.isBlank()) {
      return null;
    }
    String likeValue = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
    return (root, query, criteriaBuilder) -> criteriaBuilder.or(
        criteriaBuilder.like(criteriaBuilder.lower(root.get("quoteNumber")), likeValue),
        criteriaBuilder.like(criteriaBuilder.lower(root.get("customerName")), likeValue),
        criteriaBuilder.like(criteriaBuilder.lower(root.get("company")), likeValue)
    );
  }

  private static Specification<QuoteEntity> status(QuoteStatus status) {
    if (status == null) {
      return null;
    }
    return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"), status);
  }
}
