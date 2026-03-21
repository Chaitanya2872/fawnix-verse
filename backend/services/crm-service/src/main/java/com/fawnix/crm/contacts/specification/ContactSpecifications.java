package com.fawnix.crm.contacts.specification;

import com.fawnix.crm.contacts.entity.ContactEntity;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class ContactSpecifications {

  private ContactSpecifications() {
  }

  public static Specification<ContactEntity> withFilters(String search, String accountId) {
    return (root, query, builder) -> {
      var predicate = builder.conjunction();
      if (accountId != null && !accountId.isBlank()) {
        predicate = builder.and(predicate, builder.equal(root.get("account").get("id"), accountId));
      }
      if (search == null || search.isBlank()) {
        return predicate;
      }
      String like = "%" + search.toLowerCase(Locale.ROOT).trim() + "%";
      return builder.and(
          predicate,
          builder.or(
              builder.like(builder.lower(root.get("name")), like),
              builder.like(builder.lower(root.get("email")), like),
              builder.like(builder.lower(root.get("phone")), like)
          )
      );
    };
  }
}
