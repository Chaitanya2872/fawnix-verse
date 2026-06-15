package com.fawnix.sales.reports.service;

import com.fawnix.sales.invoices.entity.SalesInvoiceEntity;
import com.fawnix.sales.invoices.repository.SalesInvoiceRepository;
import com.fawnix.sales.orders.entity.SalesOrderEntity;
import com.fawnix.sales.orders.entity.SalesOrderStatus;
import com.fawnix.sales.orders.repository.SalesOrderRepository;
import com.fawnix.sales.payments.entity.SalesPaymentEntity;
import com.fawnix.sales.payments.repository.SalesPaymentRepository;
import com.fawnix.sales.reports.dto.SalesReportDtos;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesReportService {

  private final SalesOrderRepository orderRepository;
  private final SalesInvoiceRepository invoiceRepository;
  private final SalesPaymentRepository paymentRepository;

  public SalesReportService(
      SalesOrderRepository orderRepository,
      SalesInvoiceRepository invoiceRepository,
      SalesPaymentRepository paymentRepository
  ) {
    this.orderRepository = orderRepository;
    this.invoiceRepository = invoiceRepository;
    this.paymentRepository = paymentRepository;
  }

  @Transactional(readOnly = true)
  public SalesReportDtos.SalesReportResponse getOverview() {
    List<SalesOrderEntity> orders = orderRepository.findAll();
    List<SalesInvoiceEntity> invoices = invoiceRepository.findAllByOrderByCreatedAtDesc();
    List<SalesPaymentEntity> payments = paymentRepository.findTop50ByOrderByCreatedAtDesc();

    BigDecimal outstanding = invoices.stream()
        .map(SalesInvoiceEntity::getBalanceDue)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal overdue = invoices.stream()
        .filter(invoice -> invoice.getDueDate() != null && invoice.getDueDate().isBefore(LocalDate.now()) && invoice.getBalanceDue().compareTo(BigDecimal.ZERO) > 0)
        .map(SalesInvoiceEntity::getBalanceDue)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal paymentsReceived = payments.stream()
        .map(SalesPaymentEntity::getAmount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

    List<SalesReportDtos.Metric> metrics = List.of(
        new SalesReportDtos.Metric("Total orders", "totalOrders", BigDecimal.valueOf(orders.size())),
        new SalesReportDtos.Metric("Approved orders", "approvedOrders", BigDecimal.valueOf(orders.stream().filter(order -> order.getStatus() == SalesOrderStatus.APPROVED || order.getStatus() == SalesOrderStatus.CONFIRMED).count())),
        new SalesReportDtos.Metric("Pending approvals", "pendingApprovals", BigDecimal.valueOf(orders.stream().filter(order -> order.getStatus() == SalesOrderStatus.PENDING_APPROVAL).count())),
        new SalesReportDtos.Metric("Delivered orders", "deliveredOrders", BigDecimal.valueOf(orders.stream().filter(order -> order.getStatus() == SalesOrderStatus.DELIVERED || order.getStatus() == SalesOrderStatus.PARTIALLY_DELIVERED).count())),
        new SalesReportDtos.Metric("Outstanding amount", "outstandingAmount", outstanding),
        new SalesReportDtos.Metric("Overdue invoices", "overdueInvoices", overdue),
        new SalesReportDtos.Metric("Payments received", "paymentsReceived", paymentsReceived),
        new SalesReportDtos.Metric("Orders this month", "ordersThisMonth", BigDecimal.valueOf(orderRepository.countByCreatedAtAfter(LocalDate.now().withDayOfMonth(1).atStartOfDay().toInstant(ZoneOffset.UTC))))
    );

    Map<String, BigDecimal> customerSales = new HashMap<>();
    Map<String, BigDecimal> customerOutstanding = new HashMap<>();
    for (SalesOrderEntity order : orders) {
      customerSales.merge(order.getCustomerName(), order.getTotal(), BigDecimal::add);
    }
    for (SalesInvoiceEntity invoice : invoices) {
      customerOutstanding.merge(invoice.getCustomerName(), invoice.getBalanceDue(), BigDecimal::add);
    }

    List<SalesReportDtos.CustomerSalesRow> customerRows = new ArrayList<>();
    for (Map.Entry<String, BigDecimal> entry : customerSales.entrySet()) {
      customerRows.add(new SalesReportDtos.CustomerSalesRow(
          entry.getKey(),
          entry.getValue(),
          customerOutstanding.getOrDefault(entry.getKey(), BigDecimal.ZERO)
      ));
    }
    customerRows.sort(Comparator.comparing(SalesReportDtos.CustomerSalesRow::totalSales).reversed());

    List<SalesReportDtos.CustomerSalesRow> overdueCustomers = invoices.stream()
        .filter(invoice -> invoice.getDueDate() != null && invoice.getDueDate().isBefore(LocalDate.now()) && invoice.getBalanceDue().compareTo(BigDecimal.ZERO) > 0)
        .map(invoice -> new SalesReportDtos.CustomerSalesRow(invoice.getCustomerName(), invoice.getTotal(), invoice.getBalanceDue()))
        .sorted(Comparator.comparing(SalesReportDtos.CustomerSalesRow::outstandingAmount).reversed())
        .toList();

    return new SalesReportDtos.SalesReportResponse(metrics, customerRows.stream().limit(10).toList(), overdueCustomers.stream().limit(10).toList());
  }
}
