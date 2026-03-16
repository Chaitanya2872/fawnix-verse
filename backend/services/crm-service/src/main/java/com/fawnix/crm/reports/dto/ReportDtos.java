package com.fawnix.crm.reports.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class ReportDtos {

  private ReportDtos() {
  }

  public record StageMetric(
      String status,
      long count
  ) {
  }

  public record SourceMetric(
      String source,
      long total,
      long converted,
      double conversionRate
  ) {
  }

  public record RepMetric(
      String userId,
      String name,
      long assigned,
      long active,
      long converted,
      long lost,
      BigDecimal pipelineValue
  ) {
  }

  public record LeadQuickView(
      String id,
      String name,
      String company,
      String status,
      String assignedToName,
      Instant lastContactedAt,
      Instant createdAt
  ) {
  }

  public record OverviewResponse(
      long totalLeads,
      BigDecimal pipelineValue,
      long convertedCount,
      long lostCount,
      double conversionRate,
      double lossRate,
      Map<String, Long> statusCounts,
      List<StageMetric> stageMetrics,
      List<SourceMetric> sourcePerformance,
      List<RepMetric> repPerformance,
      double avgDaysToFirstContact,
      Map<String, Double> avgDaysInStage
  ) {
  }

  public record PreSalesOverviewResponse(
      Map<String, Long> statusCounts,
      List<LeadQuickView> myQueue,
      List<LeadQuickView> needsContact,
      List<LeadQuickView> followUps,
      List<LeadQuickView> awaitingAssignment
  ) {
  }
}
