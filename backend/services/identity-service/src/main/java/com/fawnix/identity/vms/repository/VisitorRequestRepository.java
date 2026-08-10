package com.fawnix.identity.vms.repository;

import com.fawnix.identity.vms.entity.VisitorRequestEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitorRequestRepository extends JpaRepository<VisitorRequestEntity, String> {

  Optional<VisitorRequestEntity> findByVisitorId(String visitorId);

  Optional<VisitorRequestEntity> findByQrCodeData(String qrCodeData);
}
