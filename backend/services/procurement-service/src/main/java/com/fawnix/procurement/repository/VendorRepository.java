package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.Vendor;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VendorRepository extends JpaRepository<Vendor, UUID> {

  boolean existsByVendorCodeIgnoreCase(String vendorCode);

  boolean existsByEmailIgnoreCase(String email);

  boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);

  boolean existsByMobile(String mobile);

  boolean existsByMobileAndIdNot(String mobile, UUID id);

  Optional<Vendor> findFirstByEmailIgnoreCase(String email);

  Optional<Vendor> findFirstByMobile(String mobile);

  List<Vendor> findAllByOrderByCreatedAtDesc();

  @Override
  Optional<Vendor> findById(UUID id);
}
