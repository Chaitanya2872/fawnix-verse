package com.fawnix.procurement.repository;

import com.fawnix.procurement.domain.Vendor;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VendorRepository extends JpaRepository<Vendor, UUID> {

  boolean existsByVendorCodeIgnoreCase(String vendorCode);
}
