package com.fawnix.crm.leads.specification;

import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.leads.entity.LeadPriority;
import com.fawnix.crm.leads.entity.LeadSource;
import com.fawnix.crm.leads.entity.LeadStatus;
import java.time.Instant;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class LeadSpecifications {

  private LeadSpecifications() {
  }

  public static Specification<LeadEntity> withFilters(
      String search,
      LeadStatus status,
      LeadSource source,
      LeadPriority priority,
      String assignedTo
  ) {
    return Specification.where(search(search))
        .and(status(status))
        .and(source(source))
        .and(priority(priority))
        .and(assignedTo(assignedTo));
  }

  private static Specification<LeadEntity> search(String search) {
    if (search == null || search.isBlank()) {
      return null;
    }
    String likeValue = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
    return (root, query, criteriaBuilder) -> criteriaBuilder.or(
        criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), likeValue),
        criteriaBuilder.like(criteriaBuilder.lower(root.get("company")), likeValue),
        criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), likeValue)
    );
  }

  private static Specification<LeadEntity> status(LeadStatus status) {
    if (status == null) {
      return null;
    }
    return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"), status);
  }

  private static Specification<LeadEntity> source(LeadSource source) {
    if (source == null) {
      return null;
    }
    return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("source"), source);
  }

  private static Specification<LeadEntity> priority(LeadPriority priority) {
    if (priority == null) {
      return null;
    }
    return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("priority"), priority);
  }

  private static Specification<LeadEntity> assignedTo(String assignedTo) {
    if (assignedTo == null || assignedTo.isBlank()) {
      return null;
    }
    if ("UNASSIGNED".equalsIgnoreCase(assignedTo)) {
      return (root, query, criteriaBuilder) -> criteriaBuilder.isNull(root.get("assignedToUserId"));
    }
    String normalized = assignedTo.trim().toLowerCase(Locale.ROOT);
    return (root, query, criteriaBuilder) -> criteriaBuilder.or(
        criteriaBuilder.equal(criteriaBuilder.lower(root.get("assignedToName")), normalized),
        criteriaBuilder.equal(criteriaBuilder.lower(root.get("assignedToUserId")), normalized)
    );
  }

  public static Specification<LeadEntity> createdBetween(Instant start, Instant end) {
    if (start == null && end == null) {
      return null;
    }
    if (start != null && end != null) {
      return (root, query, criteriaBuilder) -> criteriaBuilder.between(root.get("createdAt"), start, end);
    }
    if (start != null) {
      return (root, query, criteriaBuilder) -> criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), start);
    }
    return (root, query, criteriaBuilder) -> criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), end);
  }
}
