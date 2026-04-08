package com.fawnix.crm.leads.specification;

import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.leads.entity.LeadPriority;
import com.fawnix.crm.leads.entity.LeadSource;
import com.fawnix.crm.leads.entity.LeadStatus;
import jakarta.persistence.criteria.Subquery;
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
      String assignedTo,
      String questionnaireStatus
  ) {
    return Specification.where(search(search))
        .and(status(status))
        .and(source(source))
        .and(priority(priority))
        .and(assignedTo(assignedTo))
        .and(questionnaireStatus(questionnaireStatus));
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

  private static Specification<LeadEntity> questionnaireStatus(String questionnaireStatus) {
    if (questionnaireStatus == null || questionnaireStatus.isBlank() || "ALL".equalsIgnoreCase(questionnaireStatus)) {
      return null;
    }

    String normalized = questionnaireStatus.trim().toUpperCase(Locale.ROOT);
    return switch (normalized) {
      case "ANSWERED" -> (root, query, criteriaBuilder) -> {
        Subquery<String> answeredSubquery = query.subquery(String.class);
        var questionnaireRoot = answeredSubquery.from(com.fawnix.crm.integrations.whatsapp.LeadWhatsappQuestionnaireEntity.class);
        answeredSubquery.select(questionnaireRoot.get("id"));
        answeredSubquery.where(
            criteriaBuilder.equal(questionnaireRoot.get("lead"), root),
            criteriaBuilder.isNotNull(questionnaireRoot.get("completedAt"))
        );
        return criteriaBuilder.exists(answeredSubquery);
      };
      case "NO_RESPONSE" -> (root, query, criteriaBuilder) -> {
        Subquery<String> answeredSubquery = query.subquery(String.class);
        var questionnaireRoot = answeredSubquery.from(com.fawnix.crm.integrations.whatsapp.LeadWhatsappQuestionnaireEntity.class);
        answeredSubquery.select(questionnaireRoot.get("id"));
        answeredSubquery.where(
            criteriaBuilder.equal(questionnaireRoot.get("lead"), root),
            criteriaBuilder.isNotNull(questionnaireRoot.get("completedAt"))
        );
        return criteriaBuilder.and(
            criteriaBuilder.isNotNull(root.get("whatsappQuestionnaireSentAt")),
            criteriaBuilder.not(criteriaBuilder.exists(answeredSubquery))
        );
      };
      default -> null;
    };
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
