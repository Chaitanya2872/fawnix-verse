package com.fawnix.crm.leads.validator;

import com.fawnix.crm.common.exception.BadRequestException;
import com.fawnix.crm.leads.entity.LeadPriority;
import com.fawnix.crm.leads.entity.LeadSource;
import com.fawnix.crm.leads.entity.LeadStatus;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class LeadRequestValidator {

  public LeadStatus parseStatus(String value) {
    try {
      return LeadStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (Exception exception) {
      throw new BadRequestException("Invalid lead status.");
    }
  }

  public LeadSource parseSource(String value) {
    try {
      return LeadSource.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (Exception exception) {
      throw new BadRequestException("Invalid lead source.");
    }
  }

  public LeadPriority parsePriority(String value) {
    try {
      return LeadPriority.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (Exception exception) {
      throw new BadRequestException("Invalid lead priority.");
    }
  }

  public List<String> normalizeTags(List<String> tags) {
    if (tags == null) {
      return List.of();
    }

    LinkedHashSet<String> normalized = new LinkedHashSet<>();
    for (String tag : tags) {
      if (tag == null) {
        continue;
      }
      String value = tag.trim().toLowerCase(Locale.ROOT);
      if (!value.isEmpty()) {
        normalized.add(value);
      }
    }
    return new ArrayList<>(normalized);
  }

  public String requireRemarkContent(String content) {
    if (content == null || content.trim().isEmpty()) {
      throw new BadRequestException("Remark content is required.");
    }
    return content.trim();
  }
}
