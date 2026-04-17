package com.fawnix.procurement.service;

import com.fawnix.procurement.common.exception.BadRequestException;
import com.fawnix.procurement.common.exception.ResourceNotFoundException;
import com.fawnix.procurement.domain.Vendor;
import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.mapper.ProcurementMapper;
import com.fawnix.procurement.repository.VendorRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VendorService {

  private final VendorRepository vendorRepository;
  private final ProcurementMapper procurementMapper;

  public VendorService(
      VendorRepository vendorRepository,
      ProcurementMapper procurementMapper
  ) {
    this.vendorRepository = vendorRepository;
    this.procurementMapper = procurementMapper;
  }

  @Transactional
  public ProcurementDtos.VendorResponse createVendor(ProcurementDtos.CreateVendorRequest request) {
    if (vendorRepository.existsByVendorCodeIgnoreCase(request.vendorCode().trim())) {
      throw new BadRequestException("Vendor code already exists.");
    }
    Vendor vendor = new Vendor();
    vendor.setId(UUID.randomUUID());
    vendor.setVendorCode(request.vendorCode().trim());
    applyVendorFields(vendor, request.vendorName(), request.email(), request.phone(), request.taxIdentifier(),
        request.addressLine1(), request.addressLine2(), request.city(), request.state(), request.country(), request.postalCode());
    return procurementMapper.toVendorResponse(vendorRepository.save(vendor));
  }

  @Transactional(readOnly = true)
  public List<ProcurementDtos.VendorResponse> getVendors() {
    return vendorRepository.findAll().stream()
        .map(procurementMapper::toVendorResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public ProcurementDtos.VendorResponse getVendor(UUID id) {
    return procurementMapper.toVendorResponse(requireVendor(id));
  }

  @Transactional
  public ProcurementDtos.VendorResponse updateVendor(UUID id, ProcurementDtos.UpdateVendorRequest request) {
    Vendor vendor = requireVendor(id);
    applyVendorFields(vendor, request.vendorName(), request.email(), request.phone(), request.taxIdentifier(),
        request.addressLine1(), request.addressLine2(), request.city(), request.state(), request.country(), request.postalCode());
    return procurementMapper.toVendorResponse(vendorRepository.save(vendor));
  }

  @Transactional
  public void deleteVendor(UUID id) {
    vendorRepository.delete(requireVendor(id));
  }

  public Vendor requireVendor(UUID id) {
    return vendorRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Vendor not found."));
  }

  private void applyVendorFields(
      Vendor vendor,
      String vendorName,
      String email,
      String phone,
      String taxIdentifier,
      String addressLine1,
      String addressLine2,
      String city,
      String state,
      String country,
      String postalCode
  ) {
    vendor.setVendorName(vendorName.trim());
    vendor.setEmail(trimToNull(email));
    vendor.setPhone(trimToNull(phone));
    vendor.setTaxIdentifier(trimToNull(taxIdentifier));
    vendor.setAddressLine1(trimToNull(addressLine1));
    vendor.setAddressLine2(trimToNull(addressLine2));
    vendor.setCity(trimToNull(city));
    vendor.setState(trimToNull(state));
    vendor.setCountry(trimToNull(country));
    vendor.setPostalCode(trimToNull(postalCode));
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
