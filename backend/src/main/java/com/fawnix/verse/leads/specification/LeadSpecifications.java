package com.fawnix.verse.leads.specification;

import com.fawnix.verse.leads.entity.LeadEntity;
import com.fawnix.verse.leads.entity.LeadPriority;
import com.fawnix.verse.leads.entity.LeadSource;
import com.fawnix.verse.leads.entity.LeadStatus;
import com.fawnix.verse.users.entity.UserEntity;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
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
    String normalized = assignedTo.trim().toLowerCase(Locale.ROOT);
    return (root, query, criteriaBuilder) -> {
      Join<LeadEntity, UserEntity> assignedUser = root.join("assignedToUser", JoinType.LEFT);
      return criteriaBuilder.or(
          criteriaBuilder.equal(criteriaBuilder.lower(assignedUser.get("fullName")), normalized),
          criteriaBuilder.equal(criteriaBuilder.lower(assignedUser.get("id")), normalized)
      );
    };
  }
}
