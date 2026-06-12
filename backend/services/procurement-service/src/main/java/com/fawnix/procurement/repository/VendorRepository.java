package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.Vendor;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VendorRepository extends JpaRepository<Vendor, UUID> {

  boolean existsByVendorCodeIgnoreCase(String vendorCode);

  boolean existsByEmailIgnoreCase(String email);

  boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);

  boolean existsByMobile(String mobile);

  boolean existsByMobileAndIdNot(String mobile, UUID id);

  @EntityGraph(attributePaths = {"addresses", "contactPersons", "bankAccounts"})
  List<Vendor> findAllByOrderByCreatedAtDesc();

  @Override
  @EntityGraph(attributePaths = {"addresses", "contactPersons", "bankAccounts"})
  Optional<Vendor> findById(UUID id);
}
