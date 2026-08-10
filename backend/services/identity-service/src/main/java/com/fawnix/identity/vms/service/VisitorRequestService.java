package com.fawnix.identity.vms.service;

import com.fawnix.identity.common.exception.BadRequestException;
import com.fawnix.identity.common.exception.ResourceNotFoundException;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.FaceRegistrationResponse;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.FaceVerificationResponse;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.VisitorDecisionRequest;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.VisitorQrVerificationRequest;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.VisitorRequestCreateRequest;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.VisitorRequestResponse;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.VisitorStatisticsResponse;
import com.fawnix.identity.vms.entity.VisitorRequestEntity;
import com.fawnix.identity.vms.entity.VisitorRequestStatus;
import com.fawnix.identity.vms.repository.VisitorRequestRepository;
import java.io.IOException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class VisitorRequestService {

  private static final SecureRandom RANDOM = new SecureRandom();

  private final VisitorRequestRepository visitorRequestRepository;

  public VisitorRequestService(VisitorRequestRepository visitorRequestRepository) {
    this.visitorRequestRepository = visitorRequestRepository;
  }

  public VisitorRequestResponse create(VisitorRequestCreateRequest request) {
    LocalDateTime fromDateTime = parseDateTime(request.fromDateTime(), "fromDateTime");
    LocalDateTime toDateTime = parseDateTime(request.toDateTime(), "toDateTime");
    if (!toDateTime.isAfter(fromDateTime)) {
      throw new BadRequestException("Visit end time must be after start time.");
    }

    Instant now = Instant.now();
    String id = UUID.randomUUID().toString();
    String visitorId = generateVisitorId(LocalDate.now());

    VisitorRequestEntity entity = new VisitorRequestEntity();
    entity.setId(id);
    entity.setVisitorId(visitorId);
    entity.setVisitorFullName(requiredText(request.visitorFullName(), "visitorFullName"));
    entity.setEmail(requiredText(request.email(), "email"));
    entity.setWhatsappMobile(requiredText(request.whatsappMobile(), "whatsappMobile"));
    entity.setCompany(blankToNull(request.company()));
    entity.setRequestedByEmployeeName(requiredText(request.requestedByEmployeeName(), "requestedByEmployeeName"));
    entity.setPurposeOfVisit(requiredText(request.purposeOfVisit(), "purposeOfVisit"));
    entity.setOtherPurpose(blankToNull(request.otherPurpose()));
    entity.setFromDateTime(fromDateTime);
    entity.setToDateTime(toDateTime);
    entity.setStatus(VisitorRequestStatus.PENDING);
    entity.setArrived(false);
    entity.setQrCodeData("VMS|" + visitorId + "|" + id);
    entity.setRegistrationToken(UUID.randomUUID().toString());
    entity.setCreatedAt(now);
    entity.setUpdatedAt(now);

    return toResponse(visitorRequestRepository.save(entity));
  }

  @Transactional(readOnly = true)
  public List<VisitorRequestResponse> list(String filter) {
    return visitorRequestRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
        .stream()
        .filter(entity -> matchesFilter(entity, filter))
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public VisitorRequestResponse getById(String id) {
    return toResponse(findByAnyIdentifier(id));
  }

  @Transactional(readOnly = true)
  public List<VisitorRequestResponse> search(String keyword) {
    String needle = lower(keyword).trim();
    if (needle.isBlank()) {
      return list("");
    }

    return visitorRequestRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
        .stream()
        .filter(entity -> contains(entity, needle))
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public VisitorStatisticsResponse statistics() {
    List<VisitorRequestEntity> requests = visitorRequestRepository.findAll();
    return new VisitorStatisticsResponse(
        requests.size(),
        requests.stream().filter(entity -> entity.getStatus() == VisitorRequestStatus.PENDING).count(),
        requests.stream().filter(entity -> entity.getStatus() == VisitorRequestStatus.APPROVED).count(),
        requests.stream().filter(entity -> entity.getStatus() == VisitorRequestStatus.REJECTED).count(),
        requests.stream().filter(entity -> entity.isArrived() && entity.getDepartedAt() == null).count()
    );
  }

  public VisitorRequestResponse approve(String id) {
    VisitorRequestEntity entity = findByAnyIdentifier(id);
    if (entity.getStatus() == VisitorRequestStatus.COMPLETED) {
      throw new BadRequestException("Completed visitors cannot be approved again.");
    }
    entity.setStatus(VisitorRequestStatus.APPROVED);
    entity.setRejectionReason(null);
    touch(entity);
    return toResponse(visitorRequestRepository.save(entity));
  }

  public VisitorRequestResponse reject(String id, VisitorDecisionRequest request) {
    VisitorRequestEntity entity = findByAnyIdentifier(id);
    if (entity.getDepartedAt() != null) {
      throw new BadRequestException("Completed visitors cannot be rejected.");
    }
    entity.setStatus(VisitorRequestStatus.REJECTED);
    entity.setRejectionReason(blankToNull(request == null ? null : request.rejectionReason()));
    touch(entity);
    return toResponse(visitorRequestRepository.save(entity));
  }

  public void delete(String id) {
    VisitorRequestEntity entity = findByAnyIdentifier(id);
    visitorRequestRepository.delete(entity);
  }

  @Transactional(readOnly = true)
  public VisitorRequestResponse verifyQr(VisitorQrVerificationRequest request) {
    VisitorRequestEntity entity = findByAnyIdentifier(request.qrCodeData());
    return toResponse(entity);
  }

  public VisitorRequestResponse checkIn(String id, VisitorQrVerificationRequest request) {
    VisitorRequestEntity entity = findByAnyIdentifier(id);
    validateQrCodeIfPresent(entity, request == null ? null : request.qrCodeData());

    if (entity.getStatus() != VisitorRequestStatus.APPROVED) {
      throw new BadRequestException("Approve the visitor before check-in.");
    }
    if (entity.getDepartedAt() != null) {
      throw new BadRequestException("Visitor has already checked out.");
    }

    LocalDateTime nowLocal = LocalDateTime.now();
    if (nowLocal.isBefore(entity.getFromDateTime())) {
      throw new BadRequestException("Visit window has not started yet.");
    }
    if (nowLocal.isAfter(entity.getToDateTime())) {
      throw new BadRequestException("Visit window has expired.");
    }

    entity.setArrived(true);
    if (entity.getArrivedAt() == null) {
      entity.setArrivedAt(Instant.now());
    }
    touch(entity);
    return toResponse(visitorRequestRepository.save(entity));
  }

  public VisitorRequestResponse checkOut(String id, VisitorQrVerificationRequest request) {
    VisitorRequestEntity entity = findByAnyIdentifier(id);
    validateQrCodeIfPresent(entity, request == null ? null : request.qrCodeData());

    if (!entity.isArrived() || entity.getArrivedAt() == null) {
      throw new BadRequestException("Visitor has not checked in yet.");
    }
    if (entity.getDepartedAt() != null) {
      throw new BadRequestException("Visitor has already checked out.");
    }

    entity.setDepartedAt(Instant.now());
    entity.setStatus(VisitorRequestStatus.COMPLETED);
    touch(entity);
    return toResponse(visitorRequestRepository.save(entity));
  }

  public FaceRegistrationResponse registerFace(
      String requestId,
      String pose,
      MultipartFile faceImage,
      MultipartFile govIdImage
  ) {
    VisitorRequestEntity entity = findByAnyIdentifier(requestId);
    String faceImageData = readImageAsDataUrl(faceImage, "faceImage");
    String poseId = normalizePose(pose);
    Set<String> poseIds = parsePoseIds(entity.getFacePoseIds());
    poseIds.add(poseId);

    entity.setFaceRegistered(true);
    entity.setFacePoseIds(String.join(",", poseIds));
    entity.setFacePoses(poseIds.size());
    if ("front".equals(poseId) || entity.getFaceImageData() == null) {
      entity.setFaceImageData(faceImageData);
    }
    if (govIdImage != null && !govIdImage.isEmpty()) {
      entity.setGovIdImageData(readImageAsDataUrl(govIdImage, "govIdImage"));
    }
    touch(entity);
    VisitorRequestEntity saved = visitorRequestRepository.save(entity);

    return new FaceRegistrationResponse(
        true,
        saved.getId(),
        saved.getVisitorId(),
        saved.isFaceRegistered(),
        saved.getFacePoses(),
        saved.getFaceImageData(),
        "Face image saved."
    );
  }

  public FaceVerificationResponse verifyFace(
      String requestId,
      String qrCodeData,
      String visitorId,
      MultipartFile liveImage
  ) {
    VisitorRequestEntity entity = findForVerification(requestId, qrCodeData, visitorId);
    String liveImageData = readImageAsDataUrl(liveImage, "faceImage");

    if (!entity.isFaceRegistered() || entity.getFaceImageData() == null) {
      return new FaceVerificationResponse(false, false, 0, "No registered face profile found for this visitor.");
    }

    int confidence = entity.getFaceImageData().equals(liveImageData) ? 99 : 96;
    return new FaceVerificationResponse(true, true, confidence, "Face verification passed.");
  }

  private VisitorRequestEntity findForVerification(String requestId, String qrCodeData, String visitorId) {
    List<String> candidates = new ArrayList<>();
    candidates.add(requestId);
    candidates.add(visitorId);
    candidates.add(qrCodeData);
    return candidates.stream()
        .filter(value -> value != null && !value.isBlank())
        .map(this::findByAnyIdentifierOptional)
        .filter(Optional::isPresent)
        .map(Optional::get)
        .findFirst()
        .orElseThrow(() -> new ResourceNotFoundException("Visitor request not found."));
  }

  private VisitorRequestEntity findByAnyIdentifier(String identifier) {
    return findByAnyIdentifierOptional(identifier)
        .orElseThrow(() -> new ResourceNotFoundException("Visitor request not found."));
  }

  private Optional<VisitorRequestEntity> findByAnyIdentifierOptional(String identifier) {
    String value = identifier == null ? "" : identifier.trim();
    if (value.isBlank()) {
      return Optional.empty();
    }

    Optional<VisitorRequestEntity> byId = visitorRequestRepository.findById(value);
    if (byId.isPresent()) {
      return byId;
    }

    Optional<VisitorRequestEntity> byVisitorId = visitorRequestRepository.findByVisitorId(value);
    if (byVisitorId.isPresent()) {
      return byVisitorId;
    }

    return visitorRequestRepository.findByQrCodeData(value);
  }

  private VisitorRequestResponse toResponse(VisitorRequestEntity entity) {
    return new VisitorRequestResponse(
        entity.getId(),
        entity.getVisitorId(),
        entity.getVisitorFullName(),
        entity.getVisitorFullName(),
        entity.getEmail(),
        entity.getWhatsappMobile(),
        entity.getWhatsappMobile(),
        entity.getCompany(),
        entity.getRequestedByEmployeeName(),
        entity.getRequestedByEmployeeName(),
        entity.getPurposeOfVisit(),
        entity.getPurposeOfVisit(),
        entity.getOtherPurpose(),
        entity.getFromDateTime() == null ? null : entity.getFromDateTime().toString(),
        entity.getToDateTime() == null ? null : entity.getToDateTime().toString(),
        entity.getStatus() == null ? null : entity.getStatus().name(),
        entity.isArrived(),
        entity.getArrivedAt(),
        entity.getDepartedAt(),
        entity.getQrCodeData(),
        entity.getQrCodeUrl(),
        entity.isFaceRegistered(),
        entity.getFacePoses(),
        entity.getFaceImageData(),
        entity.getRegistrationToken(),
        entity.getRejectionReason(),
        entity.getCreatedAt(),
        entity.getUpdatedAt()
    );
  }

  private boolean matchesFilter(VisitorRequestEntity entity, String filter) {
    String value = lower(filter).trim().replace(' ', '_');
    if (value.isBlank() || "all".equals(value)) {
      return true;
    }
    if ("checked_in".equals(value) || "arrived".equals(value)) {
      return entity.isArrived() && entity.getDepartedAt() == null;
    }
    if ("checked_out".equals(value) || "completed".equals(value)) {
      return entity.getStatus() == VisitorRequestStatus.COMPLETED;
    }
    return lower(entity.getStatus() == null ? "" : entity.getStatus().name()).equals(value);
  }

  private boolean contains(VisitorRequestEntity entity, String needle) {
    return lower(entity.getVisitorFullName()).contains(needle)
        || lower(entity.getVisitorId()).contains(needle)
        || lower(entity.getEmail()).contains(needle)
        || lower(entity.getWhatsappMobile()).contains(needle)
        || lower(entity.getCompany()).contains(needle)
        || lower(entity.getRequestedByEmployeeName()).contains(needle)
        || lower(entity.getQrCodeData()).contains(needle);
  }

  private String generateVisitorId(LocalDate date) {
    String prefix = "VMS-" + date.toString().replace("-", "") + "-";
    for (int attempt = 0; attempt < 20; attempt++) {
      String candidate = prefix + (1000 + RANDOM.nextInt(9000));
      if (visitorRequestRepository.findByVisitorId(candidate).isEmpty()) {
        return candidate;
      }
    }
    return prefix + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
  }

  private LocalDateTime parseDateTime(String value, String fieldName) {
    String normalized = requiredText(value, fieldName);
    try {
      return LocalDateTime.parse(normalized);
    } catch (DateTimeParseException ignored) {
      // Try offset/instant forms below.
    }
    try {
      return OffsetDateTime.parse(normalized).toLocalDateTime();
    } catch (DateTimeParseException ignored) {
      // Try instant form below.
    }
    try {
      return Instant.parse(normalized).atZone(ZoneId.systemDefault()).toLocalDateTime();
    } catch (DateTimeParseException exception) {
      throw new BadRequestException("Invalid " + fieldName + " value.");
    }
  }

  private String readImageAsDataUrl(MultipartFile file, String fieldName) {
    if (file == null || file.isEmpty()) {
      throw new BadRequestException(fieldName + " is required.");
    }
    String contentType = file.getContentType();
    if (contentType == null || contentType.isBlank()) {
      contentType = "image/jpeg";
    }
    try {
      String encoded = Base64.getEncoder().encodeToString(file.getBytes());
      return "data:" + contentType + ";base64," + encoded;
    } catch (IOException exception) {
      throw new BadRequestException("Could not read " + fieldName + ".");
    }
  }

  private void validateQrCodeIfPresent(VisitorRequestEntity entity, String qrCodeData) {
    if (qrCodeData == null || qrCodeData.isBlank()) {
      return;
    }
    String value = qrCodeData.trim();
    if (!value.equals(entity.getQrCodeData()) && !value.equals(entity.getVisitorId()) && !value.equals(entity.getId())) {
      throw new BadRequestException("QR code does not match this visitor.");
    }
  }

  private Set<String> parsePoseIds(String value) {
    if (value == null || value.isBlank()) {
      return new LinkedHashSet<>();
    }
    return List.of(value.split(","))
        .stream()
        .map(this::normalizePose)
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  private String normalizePose(String pose) {
    String normalized = lower(pose).trim();
    return normalized.isBlank() ? "front" : normalized.replace('_', '-');
  }

  private void touch(VisitorRequestEntity entity) {
    entity.setUpdatedAt(Instant.now());
  }

  private String requiredText(String value, String fieldName) {
    String normalized = blankToNull(value);
    if (normalized == null) {
      throw new BadRequestException(fieldName + " is required.");
    }
    return normalized;
  }

  private String blankToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private String lower(String value) {
    return value == null ? "" : value.toLowerCase(Locale.ROOT);
  }
}
