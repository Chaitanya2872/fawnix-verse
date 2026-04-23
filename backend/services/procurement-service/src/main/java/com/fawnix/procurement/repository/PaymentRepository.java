package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.Payment;
import com.fawnix.procurement.domain.PaymentStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

  boolean existsByInvoiceIdAndStatusIn(UUID invoiceId, List<PaymentStatus> statuses);
}
