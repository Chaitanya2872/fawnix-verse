package com.fawnix.crm.deals.specification;

import com.fawnix.crm.deals.entity.DealEntity;
import com.fawnix.crm.leads.entity.LeadStatus;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class DealSpecifications {

  private DealSpecifications() {
  }

  public static Specification<DealEntity> withFilters(
      String search,
      LeadStatus stage,
      String ownerUserId
  ) {
    return (root, query, builder) -> {
      var predicate = builder.conjunction();
      if (stage != null) {
        predicate = builder.and(predicate, builder.equal(root.get("stage"), stage));
      }
      if (ownerUserId != null && !ownerUserId.isBlank()) {
        predicate = builder.and(predicate, builder.equal(root.get("ownerUserId"), ownerUserId));
      }
      if (search == null || search.isBlank()) {
        return predicate;
      }
      String like = "%" + search.toLowerCase(Locale.ROOT).trim() + "%";
      return builder.and(predicate, builder.like(builder.lower(root.get("name")), like));
    };
  }
}
