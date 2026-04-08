package com.fawnix.crm.leads.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class LeadDtos {

  private LeadDtos() {
  }

  public record CreateLeadRequest(
      @NotBlank String name,
      @NotBlank String company,
      @Email String email,
      String phone,
      @NotBlank String source,
      @NotBlank String status,
      @NotBlank String priority,
      String assignedTo,
      String assignedToUserId,
      @DecimalMin(value = "0.0", inclusive = true) BigDecimal estimatedValue,
      String notes,
      List<String> tags,
      Instant followUpAt,
      String externalLeadId,
      String sourceMonth,
      String sourceDate,
      String alternativePhone,
      String projectStage,
      String expectedTimeline,
      String propertyType,
      String sqft,
      String community,
      String projectLocation,
      String projectState,
      String presalesResponse,
      String demoVisit,
      String presalesRemarks,
      String adSetName,
      String campaignName,
      String metaLeadId,
      String metaFormId,
      String metaAdId,
      Instant sourceCreatedAt
  ) {
  }

  public record UpdateLeadRequest(
      String name,
      String company,
      @Email String email,
      String phone,
      String source,
      String status,
      String priority,
      String assignedTo,
      String assignedToUserId,
      @DecimalMin(value = "0.0", inclusive = true) BigDecimal estimatedValue,
      String notes,
      List<String> tags,
      Instant lastContactedAt,
      Instant followUpAt,
      Instant convertedAt,
      String externalLeadId,
      String sourceMonth,
      String sourceDate,
      String alternativePhone,
      String projectStage,
      String expectedTimeline,
      String propertyType,
      String sqft,
      String community,
      String projectLocation,
      String projectState,
      String presalesResponse,
      String demoVisit,
      String presalesRemarks,
      String adSetName,
      String campaignName,
      String metaLeadId,
      String metaFormId,
      String metaAdId,
      Instant sourceCreatedAt,
      String statusRemark
  ) {
  }

  public record UpdateLeadStatusRequest(
      @NotBlank String status,
      Instant followUpAt,
      String remark
  ) {
  }

  public record AssignLeadRequest(
      String assignedTo,
      String assignedToUserId
  ) {
  }

  public record UpdateLeadPriorityRequest(
      @NotBlank String priority
  ) {
  }

  public record CreateRemarkRequest(
      @NotBlank String content
  ) {
  }

  public record EditRemarkRequest(
      @NotBlank String content
  ) {
  }

  public record LeadRemarkVersionResponse(
      String id,
      String content,
      Instant createdAt,
      String createdBy
  ) {
  }

  public record LeadRemarkResponse(
      String id,
      String leadId,
      Instant createdAt,
      String createdBy,
      Instant updatedAt,
      String updatedBy,
      List<LeadRemarkVersionResponse> versions
  ) {
  }

  public record LeadContactRecordingResponse(
      String id,
      String audioFileName,
      String audioContentType,
      long audioSize,
      String transcript,
      String remarksSummary,
      String conversationSummary,
      String createdBy,
      Instant contactedAt,
      Instant createdAt
  ) {
  }

  public record LeadActivityResponse(
      String id,
      String leadId,
      String type,
      String content,
      String createdBy,
      Instant createdAt
  ) {
  }

  public record LeadStatusHistoryEntryResponse(
      String id,
      String fromStatus,
      String toStatus,
      String changedByUserId,
      String changedByName,
      String note,
      Instant changedAt
  ) {
  }

  public record WhatsappDispatchLog(
      boolean sent,
      String reason
  ) {
  }

  public record LeadResponse(
      String id,
      String name,
      String company,
      String email,
      String phone,
      String externalLeadId,
      String sourceMonth,
      String sourceDate,
      String alternativePhone,
      String projectStage,
      String expectedTimeline,
      String propertyType,
      String sqft,
      String community,
      String projectLocation,
      String projectState,
      String presalesResponse,
      String demoVisit,
      String presalesRemarks,
      String adSetName,
      String campaignName,
      String metaLeadId,
      String metaFormId,
      String metaAdId,
      Instant sourceCreatedAt,
      String status,
      String source,
      String priority,
      String assignedTo,
      String assignedToUserId,
      BigDecimal estimatedValue,
      String notes,
      List<String> tags,
      List<LeadRemarkResponse> remarks,
      List<LeadContactRecordingResponse> contactRecordings,
      List<LeadActivityResponse> activities,
      List<LeadStatusHistoryEntryResponse> statusHistory,
      Instant lastContactedAt,
      Instant followUpAt,
      Instant convertedAt,
      Instant createdAt,
      Instant updatedAt,
      WhatsappDispatchLog whatsappAssignment
  ) {
  }

  public record LeadWhatsappQuestionnaireResponse(
      String id,
      String leadId,
      String phone,
      String waId,
      String language,
      List<String> interestAreas,
      String demoPreference,
      String callbackPreference,
      String callbackTimeText,
      String ownershipRole,
      String step,
      Instant createdAt,
      Instant updatedAt,
      Instant completedAt
  ) {
  }

  public record LeadScheduleResponse(
      String id,
      String leadId,
      String type,
      String status,
      Instant scheduledAt,
      String location,
      String mode,
      String notes,
      String assignedTo,
      String assignedToUserId,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record CreateLeadScheduleRequest(
      @NotBlank String type,
      Instant scheduledAt,
      String location,
      String mode,
      String notes,
      String assignedTo,
      String assignedToUserId
  ) {
  }

  public record UpdateLeadScheduleRequest(
      String type,
      String status,
      Instant scheduledAt,
      String location,
      String mode,
      String notes,
      String assignedTo,
      String assignedToUserId
  ) {
  }

  public record LeadImportError(
      int row,
      String message
  ) {
  }

  public record LeadImportResult(
      int total,
      int created,
      int updated,
      int skipped,
      List<LeadImportError> errors
  ) {
  }

  public record LeadSummaryResponse(
      BigDecimal totalPipelineValue,
      long newCount,
      long qualifiedCount,
      long convertedCount,
      Map<String, Long> statusCounts
  ) {
  }

  public record LeadNotificationsResponse(
      long newLeadCount,
      long followUpDueCount,
      Instant updatedAt
  ) {
  }

  public record LeadNotificationEvent(
      String type,
      Instant eventAt
  ) {
  }

  public record PaginatedLeadResponse(
      List<LeadResponse> data,
      long total,
      int page,
      int pageSize,
      int totalPages,
      LeadSummaryResponse summary
  ) {
  }
}
