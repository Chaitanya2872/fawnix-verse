package com.fawnix.procurement.service;

import com.fawnix.procurement.common.exception.BadRequestException;
import com.fawnix.procurement.common.exception.ResourceNotFoundException;
import com.fawnix.procurement.domain.Vendor;
import com.fawnix.procurement.domain.VendorDocument;
import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.mapper.ProcurementMapper;
import com.fawnix.procurement.repository.VendorDocumentRepository;
import com.fawnix.procurement.repository.VendorRepository;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class VendorService {

  private final VendorRepository vendorRepository;
  private final VendorDocumentRepository vendorDocumentRepository;
  private final ProcurementMapper procurementMapper;
  private static final long MAX_VENDOR_DOCUMENT_BYTES = 10L * 1024L * 1024L;

  public VendorService(
      VendorRepository vendorRepository,
      VendorDocumentRepository vendorDocumentRepository,
      ProcurementMapper procurementMapper
  ) {
    this.vendorRepository = vendorRepository;
    this.vendorDocumentRepository = vendorDocumentRepository;
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

  @Transactional(readOnly = true)
  public List<ProcurementDtos.VendorDocumentResponse> getVendorDocuments(UUID vendorId) {
    requireVendor(vendorId);
    return vendorDocumentRepository.findAllByVendorIdOrderByCreatedAtDesc(vendorId).stream()
        .map(procurementMapper::toVendorDocumentResponse)
        .toList();
  }

  @Transactional
  public ProcurementDtos.VendorDocumentResponse uploadVendorDocument(UUID vendorId, MultipartFile file) {
    Vendor vendor = requireVendor(vendorId);
    validateVendorDocument(file);

    VendorDocument vendorDocument = new VendorDocument();
    vendorDocument.setId(UUID.randomUUID());
    vendorDocument.setVendor(vendor);
    vendorDocument.setFileName(StringUtils.cleanPath(file.getOriginalFilename()));
    vendorDocument.setContentType(trimToNull(file.getContentType()));
    vendorDocument.setFileSize(file.getSize());
    try {
      vendorDocument.setFileData(file.getBytes());
    } catch (IOException exception) {
      throw new BadRequestException("Failed to read uploaded vendor document.");
    }

    return procurementMapper.toVendorDocumentResponse(vendorDocumentRepository.save(vendorDocument));
  }

  @Transactional(readOnly = true)
  public VendorDocumentContent getVendorDocumentContent(UUID vendorId, UUID documentId) {
    VendorDocument vendorDocument = requireVendorDocument(vendorId, documentId);
    MediaType mediaType;
    try {
      mediaType = vendorDocument.getContentType() != null
          ? MediaType.parseMediaType(vendorDocument.getContentType())
          : MediaType.APPLICATION_OCTET_STREAM;
    } catch (IllegalArgumentException exception) {
      mediaType = MediaType.APPLICATION_OCTET_STREAM;
    }

    return new VendorDocumentContent(
        vendorDocument.getFileName(),
        mediaType,
        vendorDocument.getFileData()
    );
  }

  @Transactional
  public void deleteVendorDocument(UUID vendorId, UUID documentId) {
    vendorDocumentRepository.delete(requireVendorDocument(vendorId, documentId));
  }

  public Vendor requireVendor(UUID id) {
    return vendorRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Vendor not found."));
  }

  private VendorDocument requireVendorDocument(UUID vendorId, UUID documentId) {
    requireVendor(vendorId);
    return vendorDocumentRepository.findByIdAndVendorId(documentId, vendorId)
        .orElseThrow(() -> new ResourceNotFoundException("Vendor document not found."));
  }

  private void validateVendorDocument(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new BadRequestException("Vendor document file is required.");
    }
    if (!StringUtils.hasText(file.getOriginalFilename())) {
      throw new BadRequestException("Vendor document name is required.");
    }
    if (file.getSize() > MAX_VENDOR_DOCUMENT_BYTES) {
      throw new BadRequestException("Vendor document exceeds the 10 MB upload limit.");
    }
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

  public record VendorDocumentContent(
      String fileName,
      MediaType mediaType,
      byte[] content
  ) {
  }
}
