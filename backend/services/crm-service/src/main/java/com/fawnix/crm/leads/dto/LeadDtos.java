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
      List<String> tags
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
      Instant convertedAt
  ) {
  }

  public record UpdateLeadStatusRequest(
      @NotBlank String status
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

  public record LeadResponse(
      String id,
      String name,
      String company,
      String email,
      String phone,
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
      Instant lastContactedAt,
      Instant convertedAt,
      Instant createdAt,
      Instant updatedAt
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
