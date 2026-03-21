package com.fawnix.crm.accounts.specification;

import com.fawnix.crm.accounts.entity.AccountEntity;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class AccountSpecifications {

  private AccountSpecifications() {
  }

  public static Specification<AccountEntity> withFilters(String search) {
    return (root, query, builder) -> {
      if (search == null || search.isBlank()) {
        return builder.conjunction();
      }
      String like = "%" + search.toLowerCase(Locale.ROOT).trim() + "%";
      return builder.like(builder.lower(root.get("name")), like);
    };
  }
}
