package com.fawnix.crm.reports.service;

import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.leads.entity.LeadSource;
import com.fawnix.crm.leads.entity.LeadStatus;
import com.fawnix.crm.leads.entity.LeadStatusHistoryEntity;
import com.fawnix.crm.leads.repository.LeadRepository;
import com.fawnix.crm.leads.repository.LeadStatusHistoryRepository;
import com.fawnix.crm.leads.specification.LeadSpecifications;
import com.fawnix.crm.reports.dto.ReportDtos;
import com.fawnix.crm.security.service.AppUserDetails;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class ReportsService {

  private static final Set<LeadStatus> PIPELINE_STATUSES = EnumSet.of(
      LeadStatus.QUALIFIED,
      LeadStatus.ASSIGNED_TO_SALESPERSON,
      LeadStatus.PROPOSAL_SENT,
      LeadStatus.CONVERTED
  );

  private static final Set<LeadStatus> PRE_SALES_STATUSES = EnumSet.of(
      LeadStatus.NEW,
      LeadStatus.CONTACTED,
      LeadStatus.FOLLOW_UP,
      LeadStatus.QUALIFIED,
      LeadStatus.UNQUALIFIED
  );

  private final LeadRepository leadRepository;
  private final LeadStatusHistoryRepository historyRepository;

  public ReportsService(
      LeadRepository leadRepository,
      LeadStatusHistoryRepository historyRepository
  ) {
    this.leadRepository = leadRepository;
    this.historyRepository = historyRepository;
  }

  public ReportDtos.OverviewResponse getOverview(Instant start, Instant end) {
    Specification<LeadEntity> spec = Specification.where(LeadSpecifications.createdBetween(start, end));
    List<LeadEntity> leads = leadRepository.findAll(spec);

    long totalLeads = leads.size();
    Map<String, Long> statusCounts = buildStatusCounts(leads);
    long convertedCount = statusCounts.getOrDefault(LeadStatus.CONVERTED.name(), 0L);
    long lostCount = statusCounts.getOrDefault(LeadStatus.LOST.name(), 0L);

    BigDecimal pipelineValue = leads.stream()
        .filter(lead -> PIPELINE_STATUSES.contains(lead.getStatus()))
        .map(LeadEntity::getEstimatedValue)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

    double conversionRate = totalLeads == 0 ? 0 : (double) convertedCount / totalLeads;
    double lossRate = totalLeads == 0 ? 0 : (double) lostCount / totalLeads;

    List<ReportDtos.StageMetric> stageMetrics = statusCounts.entrySet().stream()
        .map(entry -> new ReportDtos.StageMetric(entry.getKey(), entry.getValue()))
        .toList();

    List<ReportDtos.SourceMetric> sourcePerformance = buildSourcePerformance(leads);
    List<ReportDtos.RepMetric> repPerformance = buildRepPerformance(leads);

    double avgDaysToFirstContact = averageDaysToFirstContact(leads);
    Map<String, Double> avgDaysInStage = averageDaysInStage(leads);

    return new ReportDtos.OverviewResponse(
        totalLeads,
        pipelineValue,
        convertedCount,
        lostCount,
        roundRatio(conversionRate),
        roundRatio(lossRate),
        statusCounts,
        stageMetrics,
        sourcePerformance,
        repPerformance,
        roundRatio(avgDaysToFirstContact),
        avgDaysInStage
    );
  }

  public ReportDtos.PreSalesOverviewResponse getPreSalesOverview(AppUserDetails actor) {
    List<LeadEntity> leads = leadRepository.findAll();

    Map<String, Long> statusCounts = buildStatusCounts(leads);
    List<ReportDtos.LeadQuickView> myQueue = leads.stream()
        .filter(lead -> Objects.equals(lead.getAssignedToUserId(), actor.getUserId()))
        .filter(lead -> PRE_SALES_STATUSES.contains(lead.getStatus()))
        .sorted(Comparator.comparing(LeadEntity::getUpdatedAt).reversed())
        .limit(8)
        .map(this::toQuickView)
        .toList();

    List<ReportDtos.LeadQuickView> needsContact = leads.stream()
        .filter(lead -> lead.getStatus() == LeadStatus.NEW)
        .sorted(Comparator.comparing(LeadEntity::getCreatedAt))
        .limit(8)
        .map(this::toQuickView)
        .toList();

    List<ReportDtos.LeadQuickView> followUps = leads.stream()
        .filter(lead -> lead.getStatus() == LeadStatus.FOLLOW_UP)
        .sorted(Comparator.comparing(LeadEntity::getLastContactedAt, Comparator.nullsLast(Comparator.naturalOrder())))
        .limit(8)
        .map(this::toQuickView)
        .toList();

    List<ReportDtos.LeadQuickView> awaitingAssignment = leads.stream()
        .filter(lead ->
            (lead.getStatus() == LeadStatus.QUALIFIED || lead.getStatus() == LeadStatus.UNQUALIFIED)
                && lead.getAssignedToUserId() == null)
        .sorted(Comparator.comparing(LeadEntity::getUpdatedAt).reversed())
        .limit(8)
        .map(this::toQuickView)
        .toList();

    return new ReportDtos.PreSalesOverviewResponse(
        statusCounts,
        myQueue,
        needsContact,
        followUps,
        awaitingAssignment
    );
  }

  private Map<String, Long> buildStatusCounts(List<LeadEntity> leads) {
    Map<String, Long> counts = new LinkedHashMap<>();
    for (LeadStatus status : LeadStatus.values()) {
      long count = leads.stream().filter(lead -> lead.getStatus() == status).count();
      counts.put(status.name(), count);
    }
    return counts;
  }

  private List<ReportDtos.SourceMetric> buildSourcePerformance(List<LeadEntity> leads) {
    Map<LeadSource, List<LeadEntity>> grouped = leads.stream()
        .collect(Collectors.groupingBy(LeadEntity::getSource));
    List<ReportDtos.SourceMetric> metrics = new ArrayList<>();
    for (LeadSource source : LeadSource.values()) {
      List<LeadEntity> sourceLeads = grouped.getOrDefault(source, List.of());
      long total = sourceLeads.size();
      long converted = sourceLeads.stream().filter(lead -> lead.getStatus() == LeadStatus.CONVERTED).count();
      double rate = total == 0 ? 0 : (double) converted / total;
      metrics.add(new ReportDtos.SourceMetric(source.name(), total, converted, roundRatio(rate)));
    }
    return metrics;
  }

  private List<ReportDtos.RepMetric> buildRepPerformance(List<LeadEntity> leads) {
    Map<String, RepAccumulator> reps = new LinkedHashMap<>();
    for (LeadEntity lead : leads) {
      String repId = lead.getAssignedToUserId();
      String repName = lead.getAssignedToName();
      if (repId == null && (repName == null || repName.isBlank())) {
        continue;
      }
      String key = repId != null ? repId : repName.toLowerCase(Locale.ROOT);
      RepAccumulator accumulator = reps.computeIfAbsent(key, k -> new RepAccumulator(repId, repName));
      accumulator.assigned++;
      if (lead.getStatus() == LeadStatus.CONVERTED) {
        accumulator.converted++;
      } else if (lead.getStatus() == LeadStatus.LOST) {
        accumulator.lost++;
      } else {
        accumulator.active++;
      }
      if (PIPELINE_STATUSES.contains(lead.getStatus())) {
        accumulator.pipelineValue = accumulator.pipelineValue.add(lead.getEstimatedValue());
      }
    }

    return reps.values().stream()
        .sorted(Comparator.comparingLong((RepAccumulator acc) -> acc.assigned).reversed())
        .map(acc -> new ReportDtos.RepMetric(
            acc.userId,
            acc.name != null ? acc.name : "Unassigned",
            acc.assigned,
            acc.active,
            acc.converted,
            acc.lost,
            acc.pipelineValue
        ))
        .toList();
  }

  private double averageDaysToFirstContact(List<LeadEntity> leads) {
    List<Long> durations = leads.stream()
        .filter(lead -> lead.getLastContactedAt() != null)
        .map(lead -> Duration.between(lead.getCreatedAt(), lead.getLastContactedAt()).toMillis())
        .filter(duration -> duration >= 0)
        .toList();
    if (durations.isEmpty()) {
      return 0;
    }
    double avgMillis = durations.stream().mapToLong(Long::longValue).average().orElse(0);
    return avgMillis / 86_400_000d;
  }

  private Map<String, Double> averageDaysInStage(List<LeadEntity> leads) {
    if (leads.isEmpty()) {
      return Map.of();
    }

    List<String> leadIds = leads.stream().map(LeadEntity::getId).toList();
    List<LeadStatusHistoryEntity> historyEntries = historyRepository.findAllByLead_IdInOrderByChangedAtAsc(leadIds);
    Map<String, List<LeadStatusHistoryEntity>> historyByLead = historyEntries.stream()
        .collect(Collectors.groupingBy(entry -> entry.getLead().getId(), LinkedHashMap::new, Collectors.toList()));

    Map<LeadStatus, DurationAccumulator> durations = new EnumMap<>(LeadStatus.class);
    Instant now = Instant.now();

    for (LeadEntity lead : leads) {
      List<LeadStatusHistoryEntity> entries = historyByLead.get(lead.getId());
      if (entries == null || entries.isEmpty()) {
        Duration duration = Duration.between(lead.getCreatedAt(), now);
        recordDuration(durations, lead.getStatus(), duration);
        continue;
      }

      for (int i = 0; i < entries.size(); i++) {
        LeadStatusHistoryEntity entry = entries.get(i);
        Instant start = entry.getChangedAt();
        Instant end = i + 1 < entries.size() ? entries.get(i + 1).getChangedAt() : now;
        if (start != null && end != null && !end.isBefore(start)) {
          recordDuration(durations, entry.getToStatus(), Duration.between(start, end));
        }
      }
    }

    Map<String, Double> avgByStage = new LinkedHashMap<>();
    for (LeadStatus status : LeadStatus.values()) {
      DurationAccumulator accumulator = durations.get(status);
      if (accumulator == null || accumulator.count == 0) {
        continue;
      }
      avgByStage.put(status.name(), roundRatio(accumulator.totalMillis / (accumulator.count * 86_400_000d)));
    }
    return avgByStage;
  }

  private ReportDtos.LeadQuickView toQuickView(LeadEntity lead) {
    return new ReportDtos.LeadQuickView(
        lead.getId(),
        lead.getName(),
        lead.getCompany(),
        lead.getStatus().name(),
        lead.getAssignedToName() != null ? lead.getAssignedToName() : "Unassigned",
        lead.getLastContactedAt(),
        lead.getCreatedAt()
    );
  }

  private void recordDuration(
      Map<LeadStatus, DurationAccumulator> durations,
      LeadStatus status,
      Duration duration
  ) {
    DurationAccumulator accumulator = durations.computeIfAbsent(status, ignored -> new DurationAccumulator());
    accumulator.totalMillis += duration.toMillis();
    accumulator.count += 1;
  }

  private double roundRatio(double value) {
    if (Double.isNaN(value) || Double.isInfinite(value)) {
      return 0;
    }
    return Math.round(value * 100d) / 100d;
  }

  private static final class RepAccumulator {
    private final String userId;
    private final String name;
    private long assigned;
    private long active;
    private long converted;
    private long lost;
    private BigDecimal pipelineValue = BigDecimal.ZERO;

    private RepAccumulator(String userId, String name) {
      this.userId = userId;
      this.name = name;
    }
  }

  private static final class DurationAccumulator {
    private long totalMillis;
    private long count;
  }
}
