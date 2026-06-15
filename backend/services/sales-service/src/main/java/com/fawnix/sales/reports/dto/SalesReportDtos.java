package com.fawnix.sales.reports.dto;

import java.math.BigDecimal;
import java.util.List;

public final class SalesReportDtos {

  private SalesReportDtos() {
  }

  public record Metric(String label, String key, BigDecimal value) {
  }

  public record CustomerSalesRow(String customerName, BigDecimal totalSales, BigDecimal outstandingAmount) {
  }

  public record SalesReportResponse(
      List<Metric> metrics,
      List<CustomerSalesRow> customerSales,
      List<CustomerSalesRow> overdueCustomers
  ) {
  }
}
