package com.fawnix.sales.invoices.repository;

import com.fawnix.sales.invoices.entity.SalesInvoiceEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesInvoiceRepository extends JpaRepository<SalesInvoiceEntity, String> {
  boolean existsByInvoiceNumber(String invoiceNumber);
  List<SalesInvoiceEntity> findTop20ByOrderByCreatedAtDesc();
  List<SalesInvoiceEntity> findTop20BySalesOrderIdOrderByCreatedAtDesc(String salesOrderId);
  List<SalesInvoiceEntity> findAllByOrderByCreatedAtDesc();
}
