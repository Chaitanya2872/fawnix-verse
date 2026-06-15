package com.fawnix.sales.payments.repository;

import com.fawnix.sales.payments.entity.SalesPaymentEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesPaymentRepository extends JpaRepository<SalesPaymentEntity, String> {

  boolean existsByPaymentNumber(String paymentNumber);

  List<SalesPaymentEntity> findTop50ByOrderByCreatedAtDesc();

  List<SalesPaymentEntity> findTop50BySalesInvoiceIdOrderByCreatedAtDesc(String salesInvoiceId);
}
