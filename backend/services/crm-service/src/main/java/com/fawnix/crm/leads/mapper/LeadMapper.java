package com.fawnix.crm.leads.mapper;

import com.fawnix.crm.activities.entity.LeadActivityEntity;
import com.fawnix.crm.activities.entity.LeadActivityType;
import com.fawnix.crm.contact.entity.LeadContactRecordingEntity;
import com.fawnix.crm.leads.dto.LeadDtos;
import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.leads.entity.LeadStatus;
import com.fawnix.crm.leads.entity.LeadStatusHistoryEntity;
import com.fawnix.crm.leads.entity.LeadTagEntity;
import com.fawnix.crm.remarks.entity.LeadRemarkEntity;
import com.fawnix.crm.remarks.entity.LeadRemarkVersionEntity;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class LeadMapper {

  public LeadDtos.LeadResponse toResponse(LeadEntity lead) {
    return toResponse(lead, List.of(), null);
  }

  public LeadDtos.LeadResponse toResponse(LeadEntity lead, LeadDtos.WhatsappDispatchLog whatsappAssignment) {
    return toResponse(lead, List.of(), whatsappAssignment);
  }

  public LeadDtos.LeadResponse toResponse(
      LeadEntity lead,
      List<LeadStatusHistoryEntity> statusHistory,
      LeadDtos.WhatsappDispatchLog whatsappAssignment
  ) {
    return new LeadDtos.LeadResponse(
        lead.getId(),
        lead.getName(),
        lead.getCompany(),
        lead.getEmail(),
        lead.getPhone(),
        lead.getExternalLeadId(),
        lead.getSourceMonth(),
        lead.getSourceDate(),
        lead.getAlternativePhone(),
        lead.getProjectStage(),
        lead.getExpectedTimeline(),
        lead.getPropertyType(),
        lead.getSqft(),
        lead.getCommunity(),
        lead.getProjectLocation(),
        lead.getProjectState(),
        lead.getPresalesResponse(),
        lead.getDemoVisit(),
        lead.getPresalesRemarks(),
        lead.getAdSetName(),
        lead.getCampaignName(),
        lead.getMetaLeadId(),
        lead.getMetaFormId(),
        lead.getMetaAdId(),
        lead.getSourceCreatedAt(),
        lead.getStatus().name(),
        lead.getSource().name(),
        lead.getPriority().name(),
        lead.getAssignedToName() != null ? lead.getAssignedToName() : "",
        lead.getAssignedToUserId(),
        resolveAssignedBy(lead),
        lead.getEstimatedValue(),
        lead.getNotes(),
        lead.getTags().stream().map(LeadTagEntity::getTagValue).toList(),
        lead.getRemarks().stream().map(this::toRemarkResponse).toList(),
        lead.getContactRecordings().stream().map(this::toContactRecordingResponse).toList(),
        lead.getActivities().stream().map(this::toActivityResponse).toList(),
        statusHistory.stream().map(this::toStatusHistoryResponse).toList(),
        lead.getLastContactedAt(),
        lead.getFollowUpAt(),
        lead.getConvertedAt(),
        lead.getCreatedAt(),
        lead.getUpdatedAt(),
        whatsappAssignment
    );
  }

  private String resolveAssignedBy(LeadEntity lead) {
    return lead.getActivities().stream()
        .filter(activity -> activity.getActivityType() == LeadActivityType.ASSIGNMENT_CHANGE)
        .max(Comparator.comparing(LeadActivityEntity::getCreatedAt))
        .map(activity -> activity.getCreatedByName() != null ? activity.getCreatedByName() : "System")
        .orElse("");
  }

  private LeadDtos.LeadStatusHistoryEntryResponse toStatusHistoryResponse(LeadStatusHistoryEntity entry) {
    return new LeadDtos.LeadStatusHistoryEntryResponse(
        entry.getId(),
        entry.getFromStatus() != null ? entry.getFromStatus().name() : null,
        entry.getToStatus() != null ? entry.getToStatus().name() : null,
        entry.getChangedByUserId(),
        entry.getChangedByName(),
        entry.getNote(),
        entry.getChangedAt()
    );
  }

  public LeadDtos.LeadSummaryResponse toSummary(List<LeadEntity> leads) {
    Map<String, Long> statusCounts = new LinkedHashMap<>();
    Arrays.stream(LeadStatus.values()).forEach(status ->
        statusCounts.put(status.name(), leads.stream().filter(lead -> lead.getStatus() == status).count()));

    BigDecimal totalPipelineValue = leads.stream()
        .map(LeadEntity::getEstimatedValue)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

    long qualifiedCount = leads.stream()
        .filter(lead ->
            lead.getStatus() == LeadStatus.QUALIFIED
                || lead.getStatus() == LeadStatus.ASSIGNED_TO_SALESPERSON
                || lead.getStatus() == LeadStatus.PROPOSAL_SENT)
        .count();

    return new LeadDtos.LeadSummaryResponse(
        totalPipelineValue,
        leads.stream().filter(lead -> lead.getStatus() == LeadStatus.NEW).count(),
        qualifiedCount,
        leads.stream().filter(lead -> lead.getStatus() == LeadStatus.CONVERTED).count(),
        statusCounts
    );
  }

  private LeadDtos.LeadRemarkResponse toRemarkResponse(LeadRemarkEntity remark) {
    return new LeadDtos.LeadRemarkResponse(
        remark.getId(),
        remark.getLead().getId(),
        remark.getCreatedAt(),
        remark.getCreatedByName() != null ? remark.getCreatedByName() : "System",
        remark.getUpdatedAt(),
        remark.getUpdatedByName() != null ? remark.getUpdatedByName() : "System",
        remark.getVersions().stream()
            .sorted(Comparator.comparing(LeadRemarkVersionEntity::getCreatedAt))
            .map(this::toRemarkVersionResponse)
            .toList()
    );
  }

  private LeadDtos.LeadRemarkVersionResponse toRemarkVersionResponse(LeadRemarkVersionEntity version) {
    return new LeadDtos.LeadRemarkVersionResponse(
        version.getId(),
        version.getContent(),
        version.getCreatedAt(),
        version.getCreatedByName() != null ? version.getCreatedByName() : "System"
    );
  }

  private LeadDtos.LeadActivityResponse toActivityResponse(LeadActivityEntity activity) {
    return new LeadDtos.LeadActivityResponse(
        activity.getId(),
        activity.getLead().getId(),
        activity.getActivityType().name().toLowerCase(Locale.ROOT),
        activity.getContent(),
        activity.getCreatedByName() != null ? activity.getCreatedByName() : "System",
        activity.getCreatedAt()
    );
  }

  private LeadDtos.LeadContactRecordingResponse toContactRecordingResponse(LeadContactRecordingEntity recording) {
    return new LeadDtos.LeadContactRecordingResponse(
        recording.getId(),
        recording.getAudioFileName(),
        recording.getAudioContentType(),
        recording.getAudioSize(),
        recording.getTranscript(),
        recording.getRemarksSummary(),
        recording.getConversationSummary(),
        recording.getCreatedByName() != null ? recording.getCreatedByName() : "System",
        recording.getContactedAt(),
        recording.getCreatedAt()
    );
  }
}
