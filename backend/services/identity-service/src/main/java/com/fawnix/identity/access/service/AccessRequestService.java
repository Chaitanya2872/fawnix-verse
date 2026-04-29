package com.fawnix.identity.access.service;

import com.fawnix.identity.access.dto.AccessRequestDtos;
import com.fawnix.identity.access.entity.AccessRequestEntity;
import com.fawnix.identity.access.entity.AccessRequestStatus;
import com.fawnix.identity.access.repository.AccessRequestRepository;
import com.fawnix.identity.common.exception.BadRequestException;
import com.fawnix.identity.common.exception.ResourceNotFoundException;
import com.fawnix.identity.security.service.AppUserDetails;
import com.fawnix.identity.users.entity.UserEntity;
import com.fawnix.identity.users.permission.UserPermissionCatalog;
import com.fawnix.identity.users.repository.UserRepository;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AccessRequestService {

  private final AccessRequestRepository accessRequestRepository;
  private final UserRepository userRepository;

  public AccessRequestService(
      AccessRequestRepository accessRequestRepository,
      UserRepository userRepository
  ) {
    this.accessRequestRepository = accessRequestRepository;
    this.userRepository = userRepository;
  }

  @Transactional
  public AccessRequestDtos.AccessRequestResponse submitRequest(
      AppUserDetails requesterDetails,
      AccessRequestDtos.SubmitAccessRequest request
  ) {
    UserEntity requester = requireUser(requesterDetails.getUserId());
    Set<String> requestedPermissions = normalizePermissions(request.permissions());
    requestedPermissions.removeAll(requester.getPermissions());
    if (requestedPermissions.isEmpty()) {
      throw new BadRequestException("Selected permissions are already assigned.");
    }

    Instant now = Instant.now();
    AccessRequestEntity entity = new AccessRequestEntity(
        UUID.randomUUID().toString(),
        requester,
        AccessRequestStatus.PENDING,
        normalizeNote(request.requestNote()),
        now,
        now
    );
    entity.setPermissions(requestedPermissions);
    return toResponse(accessRequestRepository.save(entity));
  }

  @Transactional(readOnly = true)
  public List<AccessRequestDtos.AccessRequestResponse> listMyRequests(AppUserDetails requesterDetails) {
    return accessRequestRepository.findAllByRequester_IdOrderByCreatedAtDesc(requesterDetails.getUserId())
        .stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<AccessRequestDtos.AccessRequestResponse> listAllRequests(String status) {
    if (!StringUtils.hasText(status)) {
      return accessRequestRepository.findAllByOrderByCreatedAtDesc()
          .stream()
          .map(this::toResponse)
          .toList();
    }

    AccessRequestStatus requestedStatus;
    try {
      requestedStatus = AccessRequestStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw new BadRequestException("Status is invalid.");
    }

    return accessRequestRepository.findAllByStatusOrderByCreatedAtAsc(requestedStatus)
        .stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public AccessRequestDtos.AccessRequestResponse reviewRequest(
      String accessRequestId,
      AccessRequestDtos.ReviewAccessRequest request,
      AppUserDetails reviewerDetails
  ) {
    AccessRequestEntity entity = accessRequestRepository.findById(accessRequestId)
        .orElseThrow(() -> new ResourceNotFoundException("Access request not found"));
    if (entity.getStatus() != AccessRequestStatus.PENDING) {
      throw new BadRequestException("Access request has already been reviewed.");
    }

    UserEntity reviewer = requireUser(reviewerDetails.getUserId());
    String decision = request.decision().trim().toUpperCase(Locale.ROOT);
    if (!decision.equals("APPROVE") && !decision.equals("REJECT")) {
      throw new BadRequestException("Decision must be APPROVE or REJECT.");
    }

    Instant now = Instant.now();
    entity.setReviewedBy(reviewer);
    entity.setReviewedAt(now);
    entity.setReviewNote(normalizeNote(request.reviewNote()));
    entity.setUpdatedAt(now);

    if (decision.equals("APPROVE")) {
      Set<String> approvedPermissions = request.permissions() == null
          ? new LinkedHashSet<>(entity.getPermissions())
          : normalizePermissions(request.permissions());
      entity.setPermissions(approvedPermissions);

      UserEntity requester = entity.getRequester();
      Set<String> nextPermissions = new LinkedHashSet<>(requester.getPermissions());
      nextPermissions.addAll(approvedPermissions);
      requester.setPermissions(nextPermissions);
      requester.setUpdatedAt(now);
      userRepository.save(requester);
      entity.setStatus(AccessRequestStatus.APPROVED);
    } else {
      entity.setStatus(AccessRequestStatus.REJECTED);
    }

    return toResponse(accessRequestRepository.save(entity));
  }

  private Set<String> normalizePermissions(List<String> requested) {
    Set<String> normalized = new LinkedHashSet<>();
    for (String permission : requested) {
      if (!StringUtils.hasText(permission)) {
        continue;
      }
      String trimmed = permission.trim();
      if (!UserPermissionCatalog.ALL_PERMISSIONS.contains(trimmed)) {
        throw new BadRequestException("Unknown permission: " + trimmed);
      }
      normalized.add(trimmed);
    }
    if (normalized.isEmpty()) {
      throw new BadRequestException("At least one permission must be selected.");
    }
    return normalized;
  }

  private String normalizeNote(String note) {
    if (!StringUtils.hasText(note)) {
      return null;
    }
    return note.trim();
  }

  private UserEntity requireUser(String userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
  }

  private AccessRequestDtos.AccessRequestResponse toResponse(AccessRequestEntity entity) {
    UserEntity reviewer = entity.getReviewedBy();
    return new AccessRequestDtos.AccessRequestResponse(
        entity.getId(),
        new AccessRequestDtos.RequesterSummary(
            entity.getRequester().getId(),
            entity.getRequester().getFullName(),
            entity.getRequester().getEmail(),
            entity.getRequester().getRoles().stream().map(role -> role.getName()).toList()
        ),
        entity.getPermissions().stream().toList(),
        entity.getStatus().name(),
        entity.getRequestNote(),
        entity.getReviewNote(),
        reviewer == null ? null : new AccessRequestDtos.ReviewerSummary(
            reviewer.getId(),
            reviewer.getFullName(),
            reviewer.getEmail()
        ),
        entity.getReviewedAt(),
        entity.getCreatedAt(),
        entity.getUpdatedAt()
    );
  }
}
