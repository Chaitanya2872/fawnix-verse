package com.fawnix.procurement.service;

import com.fawnix.procurement.common.exception.BadRequestException;
import com.fawnix.procurement.common.exception.ResourceNotFoundException;
import com.fawnix.procurement.domain.VendorAccountType;
import com.fawnix.procurement.domain.VendorAddress;
import com.fawnix.procurement.domain.VendorAddressType;
import com.fawnix.procurement.domain.VendorBankAccount;
import com.fawnix.procurement.domain.VendorContactPerson;
import com.fawnix.procurement.domain.Vendor;
import com.fawnix.procurement.domain.VendorDocument;
import com.fawnix.procurement.domain.VendorStatus;
import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.mapper.ProcurementMapper;
import com.fawnix.procurement.repository.VendorDocumentRepository;
import com.fawnix.procurement.repository.VendorRepository;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
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
  private static final Pattern GST_PATTERN = Pattern.compile("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$");
  private static final Pattern PAN_PATTERN = Pattern.compile("^[A-Z]{5}[0-9]{4}[A-Z]$");
  private static final Pattern IFSC_PATTERN = Pattern.compile("^[A-Z]{4}0[A-Z0-9]{6}$");

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
    Vendor vendor = new Vendor();
    vendor.setId(UUID.randomUUID());
    vendor.setVendorCode(generateVendorCode());
    applyVendor(vendor, request);
    return procurementMapper.toVendorResponse(vendorRepository.save(vendor));
  }

  @Transactional(readOnly = true)
  public List<ProcurementDtos.VendorResponse> getVendors() {
    return vendorRepository.findAllByOrderByCreatedAtDesc().stream()
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
    applyVendor(vendor, request);
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

  private void applyVendor(Vendor vendor, ProcurementDtos.CreateVendorRequest request) {
    applyVendor(
        vendor,
        request.vendorType(),
        request.salutation(),
        request.firstName(),
        request.lastName(),
        request.companyName(),
        request.displayName(),
        request.email(),
        request.phone(),
        request.workPhone(),
        request.mobile(),
        request.vendorLanguage(),
        request.gstNumber(),
        request.panNumber(),
        request.website(),
        request.status(),
        request.remarks(),
        request.billingAddress(),
        request.shippingAddresses(),
        request.contactPersons(),
        request.bankAccounts()
    );
  }

  private void applyVendor(Vendor vendor, ProcurementDtos.UpdateVendorRequest request) {
    applyVendor(
        vendor,
        request.vendorType(),
        request.salutation(),
        request.firstName(),
        request.lastName(),
        request.companyName(),
        request.displayName(),
        request.email(),
        request.phone(),
        request.workPhone(),
        request.mobile(),
        request.vendorLanguage(),
        request.gstNumber(),
        request.panNumber(),
        request.website(),
        request.status(),
        request.remarks(),
        request.billingAddress(),
        request.shippingAddresses(),
        request.contactPersons(),
        request.bankAccounts()
    );
  }

  private void applyVendor(
      Vendor vendor,
      String vendorType,
      String salutation,
      String firstName,
      String lastName,
      String companyName,
      String displayName,
      String email,
      String phone,
      String workPhone,
      String mobile,
      String vendorLanguage,
      String gstNumber,
      String panNumber,
      String website,
      VendorStatus status,
      String remarks,
      ProcurementDtos.VendorAddressRequest billingAddress,
      List<ProcurementDtos.VendorAddressRequest> shippingAddresses,
      List<ProcurementDtos.VendorContactPersonRequest> contactPersons,
      List<ProcurementDtos.VendorBankAccountRequest> bankAccounts
  ) {
    String normalizedDisplayName = requiredTrimmed(displayName, "Display name is required.");
    String normalizedEmail = normalizeEmail(email);
    String normalizedMobile = normalizePhone(mobile);
    String normalizedGst = normalizeUpper(gstNumber);
    String normalizedPan = normalizeUpper(panNumber);

    validateVendorUniqueness(vendor.getId(), normalizedEmail, normalizedMobile);
    validateTaxNumbers(normalizedGst, normalizedPan);
    validateContacts(contactPersons);
    validateBankAccounts(bankAccounts);

    vendor.setVendorType(trimToNull(vendorType));
    vendor.setSalutation(trimToNull(salutation));
    vendor.setFirstName(trimToNull(firstName));
    vendor.setLastName(trimToNull(lastName));
    vendor.setCompanyName(trimToNull(companyName));
    vendor.setVendorName(normalizedDisplayName);
    vendor.setEmail(normalizedEmail);
    vendor.setPhone(trimToNull(phone));
    vendor.setWorkPhone(trimToNull(workPhone));
    vendor.setMobile(normalizedMobile);
    vendor.setVendorLanguage(trimToNull(vendorLanguage));
    vendor.setGstNumber(normalizedGst);
    vendor.setPanNumber(normalizedPan);
    vendor.setWebsite(trimToNull(website));
    vendor.setStatus(status == null ? VendorStatus.ACTIVE : status);
    vendor.setRemarks(trimToNull(remarks));

    replaceAddresses(vendor, billingAddress, shippingAddresses);
    replaceContacts(vendor, contactPersons);
    replaceBankAccounts(vendor, bankAccounts);
  }

  private void replaceAddresses(
      Vendor vendor,
      ProcurementDtos.VendorAddressRequest billingAddress,
      List<ProcurementDtos.VendorAddressRequest> shippingAddresses
  ) {
    List<VendorAddress> addresses = new ArrayList<>();
    if (billingAddress != null) {
      addresses.add(toAddress(vendor, billingAddress, VendorAddressType.BILLING, true));
    }
    List<ProcurementDtos.VendorAddressRequest> shipping = shippingAddresses == null ? List.of() : shippingAddresses;
    boolean primaryAssigned = false;
    for (ProcurementDtos.VendorAddressRequest request : shipping) {
      boolean isPrimary = Boolean.TRUE.equals(request.primaryAddress()) || !primaryAssigned;
      addresses.add(toAddress(vendor, request, VendorAddressType.SHIPPING, isPrimary));
      if (isPrimary) {
        primaryAssigned = true;
      }
    }
    vendor.getAddresses().clear();
    vendor.getAddresses().addAll(addresses);
  }

  private VendorAddress toAddress(
      Vendor vendor,
      ProcurementDtos.VendorAddressRequest request,
      VendorAddressType forcedType,
      boolean primaryAddress
  ) {
    VendorAddress address = new VendorAddress();
    address.setId(UUID.randomUUID());
    address.setVendor(vendor);
    address.setAddressType(forcedType);
    address.setLabel(trimToNull(request.label()));
    address.setAttention(trimToNull(request.attention()));
    address.setAddressLine1(trimToNull(request.addressLine1()));
    address.setAddressLine2(trimToNull(request.addressLine2()));
    address.setCity(trimToNull(request.city()));
    address.setState(trimToNull(request.state()));
    address.setCountry(trimToNull(request.country()));
    address.setPostalCode(trimToNull(request.postalCode()));
    address.setPrimaryAddress(primaryAddress);
    return address;
  }

  private void replaceContacts(Vendor vendor, List<ProcurementDtos.VendorContactPersonRequest> contactRequests) {
    List<ProcurementDtos.VendorContactPersonRequest> requests = contactRequests == null ? List.of() : contactRequests;
    List<VendorContactPerson> contacts = new ArrayList<>();
    boolean primaryAssigned = false;
    for (ProcurementDtos.VendorContactPersonRequest request : requests) {
      VendorContactPerson contact = new VendorContactPerson();
      contact.setId(UUID.randomUUID());
      contact.setVendor(vendor);
      contact.setSalutation(trimToNull(request.salutation()));
      contact.setFirstName(requiredTrimmed(request.firstName(), "Contact first name is required."));
      contact.setLastName(trimToNull(request.lastName()));
      contact.setEmail(normalizeEmail(request.email()));
      contact.setWorkPhone(trimToNull(request.workPhone()));
      contact.setMobile(normalizePhone(request.mobile()));
      contact.setSkypeName(trimToNull(request.skypeName()));
      contact.setDesignation(trimToNull(request.designation()));
      contact.setDepartment(trimToNull(request.department()));
      boolean isPrimary = Boolean.TRUE.equals(request.primaryContact()) || (!primaryAssigned && contacts.isEmpty());
      contact.setPrimaryContact(isPrimary);
      contacts.add(contact);
      if (isPrimary) {
        primaryAssigned = true;
      }
    }
    vendor.getContactPersons().clear();
    vendor.getContactPersons().addAll(contacts);
  }

  private void replaceBankAccounts(Vendor vendor, List<ProcurementDtos.VendorBankAccountRequest> bankRequests) {
    List<ProcurementDtos.VendorBankAccountRequest> requests = bankRequests == null ? List.of() : bankRequests;
    List<VendorBankAccount> accounts = new ArrayList<>();
    boolean primaryAssigned = false;
    for (ProcurementDtos.VendorBankAccountRequest request : requests) {
      VendorBankAccount account = new VendorBankAccount();
      account.setId(UUID.randomUUID());
      account.setVendor(vendor);
      account.setAccountHolderName(requiredTrimmed(request.accountHolderName(), "Account holder name is required."));
      account.setBankName(requiredTrimmed(request.bankName(), "Bank name is required."));
      account.setAccountNumber(requiredTrimmed(request.accountNumber(), "Account number is required."));
      account.setIfscCode(normalizeUpper(request.ifscCode()));
      account.setBranchName(trimToNull(request.branchName()));
      account.setUpiId(trimToNull(request.upiId()));
      account.setAccountType(request.accountType() == null ? VendorAccountType.CURRENT : request.accountType());
      boolean isPrimary = Boolean.TRUE.equals(request.primaryAccount()) || (!primaryAssigned && accounts.isEmpty());
      account.setPrimaryAccount(isPrimary);
      accounts.add(account);
      if (isPrimary) {
        primaryAssigned = true;
      }
    }
    vendor.getBankAccounts().clear();
    vendor.getBankAccounts().addAll(accounts);
  }

  private void validateVendorUniqueness(UUID vendorId, String email, String mobile) {
    if (email != null) {
      boolean exists = vendorId == null
          ? vendorRepository.existsByEmailIgnoreCase(email)
          : vendorRepository.existsByEmailIgnoreCaseAndIdNot(email, vendorId);
      if (exists) {
        throw new BadRequestException("Vendor email already exists.");
      }
    }
    if (mobile != null) {
      boolean exists = vendorId == null
          ? vendorRepository.existsByMobile(mobile)
          : vendorRepository.existsByMobileAndIdNot(mobile, vendorId);
      if (exists) {
        throw new BadRequestException("Vendor mobile already exists.");
      }
    }
  }

  private void validateTaxNumbers(String gstNumber, String panNumber) {
    if (gstNumber != null && !GST_PATTERN.matcher(gstNumber).matches()) {
      throw new BadRequestException("GST number format is invalid.");
    }
    if (panNumber != null && !PAN_PATTERN.matcher(panNumber).matches()) {
      throw new BadRequestException("PAN number format is invalid.");
    }
  }

  private void validateContacts(List<ProcurementDtos.VendorContactPersonRequest> contactPersons) {
    if (contactPersons == null || contactPersons.isEmpty()) {
      return;
    }
    long primaryCount = contactPersons.stream().filter(contact -> Boolean.TRUE.equals(contact.primaryContact())).count();
    if (primaryCount > 1) {
      throw new BadRequestException("Only one contact person can be marked as primary.");
    }

    Set<String> emails = new LinkedHashSet<>();
    for (ProcurementDtos.VendorContactPersonRequest contact : contactPersons) {
      String email = normalizeEmail(contact.email());
      if (email != null && !emails.add(email)) {
        throw new BadRequestException("Duplicate contact person email found.");
      }
    }
  }

  private void validateBankAccounts(List<ProcurementDtos.VendorBankAccountRequest> bankAccounts) {
    if (bankAccounts == null || bankAccounts.isEmpty()) {
      return;
    }
    long primaryCount = bankAccounts.stream().filter(account -> Boolean.TRUE.equals(account.primaryAccount())).count();
    if (primaryCount > 1) {
      throw new BadRequestException("Only one bank account can be marked as primary.");
    }

    Set<String> uniqueAccounts = new LinkedHashSet<>();
    for (ProcurementDtos.VendorBankAccountRequest account : bankAccounts) {
      String accountNumber = requiredTrimmed(account.accountNumber(), "Account number is required.");
      String confirmAccountNumber = requiredTrimmed(account.confirmAccountNumber(), "Please re-enter account number.");
      if (!accountNumber.equals(confirmAccountNumber)) {
        throw new BadRequestException("Account number and re-entered account number must match.");
      }
      String ifsc = normalizeUpper(account.ifscCode());
      if (ifsc == null || !IFSC_PATTERN.matcher(ifsc).matches()) {
        throw new BadRequestException("IFSC code format is invalid.");
      }
      if (!uniqueAccounts.add(accountNumber)) {
        throw new BadRequestException("Duplicate bank account number found.");
      }
    }
  }

  private String generateVendorCode() {
    int sequence = vendorRepository.findAll().size() + 1;
    String candidate = formatVendorCode(sequence);
    while (vendorRepository.existsByVendorCodeIgnoreCase(candidate)) {
      sequence += 1;
      candidate = formatVendorCode(sequence);
    }
    return candidate;
  }

  private String formatVendorCode(int sequence) {
    return "VND-" + String.format("%05d", sequence);
  }

  private String requiredTrimmed(String value, String message) {
    String trimmed = trimToNull(value);
    if (trimmed == null) {
      throw new BadRequestException(message);
    }
    return trimmed;
  }

  private String normalizeEmail(String value) {
    String trimmed = trimToNull(value);
    return trimmed == null ? null : trimmed.toLowerCase(Locale.ROOT);
  }

  private String normalizeUpper(String value) {
    String trimmed = trimToNull(value);
    return trimmed == null ? null : trimmed.toUpperCase(Locale.ROOT);
  }

  private String normalizePhone(String value) {
    String trimmed = trimToNull(value);
    if (trimmed == null) {
      return null;
    }
    return trimmed.replaceAll("\\s+", "");
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
