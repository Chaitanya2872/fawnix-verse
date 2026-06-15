package com.fawnix.identity.access.service;

import com.fawnix.identity.access.dto.AccessRequestDtos;
import com.fawnix.identity.access.entity.AccessRequestEntity;
import com.fawnix.identity.access.entity.AccessRequestStatus;
import com.fawnix.identity.access.repository.AccessRequestRepository;
import com.fawnix.identity.auth.entity.PermissionEntity;
import com.fawnix.identity.auth.service.PermissionService;
import com.fawnix.identity.common.exception.BadRequestException;
import com.fawnix.identity.common.exception.ResourceNotFoundException;
import com.fawnix.identity.security.service.AppUserDetails;
import com.fawnix.identity.users.entity.UserEntity;
import com.fawnix.identity.users.repository.UserRepository;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AccessRequestService {

  private final AccessRequestRepository accessRequestRepository;
  private final UserRepository userRepository;
  private final PermissionService permissionService;

  public AccessRequestService(
      AccessRequestRepository accessRequestRepository,
      UserRepository userRepository,
      PermissionService permissionService
  ) {
    this.accessRequestRepository = accessRequestRepository;
    this.userRepository = userRepository;
    this.permissionService = permissionService;
  }

  @Transactional
  public AccessRequestDtos.AccessRequestResponse submitRequest(
      AppUserDetails requesterDetails,
      AccessRequestDtos.SubmitAccessRequest request
  ) {
    UserEntity requester = requireUser(requesterDetails.getUserId());
    Set<String> requestedPermissions = normalizePermissions(request.permissions());
    requestedPermissions.removeAll(effectivePermissions(requester));
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
  public AccessRequestDtos.AccessRequestPageResponse listMyRequests(
      AppUserDetails requesterDetails,
      String status,
      String search,
      int page,
      int pageSize
  ) {
    return listRequests(requesterDetails.getUserId(), status, search, page, pageSize);
  }

  @Transactional(readOnly = true)
  public AccessRequestDtos.AccessRequestPageResponse listAllRequests(
      String status,
      String search,
      int page,
      int pageSize
  ) {
    return listRequests(null, status, search, page, pageSize);
  }

  @Transactional(readOnly = true)
  public AccessRequestDtos.AccessRequestResponse getRequest(String accessRequestId, AppUserDetails userDetails, boolean isMaster) {
    AccessRequestEntity entity = accessRequestRepository.findById(accessRequestId)
        .orElseThrow(() -> new ResourceNotFoundException("Access request not found"));
    if (!isMaster && !entity.getRequester().getId().equals(userDetails.getUserId())) {
      throw new ResourceNotFoundException("Access request not found");
    }
    return toResponse(entity);
  }

  @Transactional
  public AccessRequestDtos.AccessRequestResponse updateRequest(
      String accessRequestId,
      AccessRequestDtos.UpdateAccessRequest request,
      AppUserDetails requesterDetails
  ) {
    AccessRequestEntity entity = requirePendingRequesterOwnedRequest(accessRequestId, requesterDetails);
    UserEntity requester = entity.getRequester();
    Set<String> permissions = normalizePermissions(request.permissions());
    permissions.removeAll(effectivePermissions(requester));
    if (permissions.isEmpty()) {
      throw new BadRequestException("Selected permissions are already assigned.");
    }
    entity.setPermissions(permissions);
    entity.setRequestNote(normalizeNote(request.requestNote()));
    entity.setUpdatedAt(Instant.now());
    return toResponse(accessRequestRepository.save(entity));
  }

  @Transactional
  public AccessRequestDtos.AccessRequestResponse cancelRequest(String accessRequestId, AppUserDetails requesterDetails) {
    AccessRequestEntity entity = requirePendingRequesterOwnedRequest(accessRequestId, requesterDetails);
    entity.setStatus(AccessRequestStatus.CANCELLED);
    entity.setUpdatedAt(Instant.now());
    return toResponse(accessRequestRepository.save(entity));
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
    Set<String> normalized = permissionService.resolvePermissions(requested).stream()
        .map(PermissionEntity::getKey)
        .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    if (normalized.isEmpty()) {
      throw new BadRequestException("At least one permission must be selected.");
    }
    return normalized;
  }

  private Set<String> effectivePermissions(UserEntity user) {
    LinkedHashSet<String> permissions = new LinkedHashSet<>(user.getPermissions());
    user.getRoles().forEach(role -> role.getPermissions().stream()
        .filter(PermissionEntity::isActive)
        .map(PermissionEntity::getKey)
        .forEach(permissions::add));
    return permissions;
  }

  private String normalizeNote(String note) {
    if (!StringUtils.hasText(note)) {
      return null;
    }
    return note.trim();
  }

  private AccessRequestDtos.AccessRequestPageResponse listRequests(
      String requesterId,
      String status,
      String search,
      int page,
      int pageSize
  ) {
    Pageable pageable = PageRequest.of(
        Math.max(0, page),
        Math.min(Math.max(1, pageSize), 100),
        Sort.by(Sort.Direction.DESC, "createdAt")
    );
    Specification<AccessRequestEntity> specification = Specification.where(byRequester(requesterId))
        .and(byStatus(status))
        .and(bySearch(search));
    Page<AccessRequestEntity> result = accessRequestRepository.findAll(specification, pageable);
    return new AccessRequestDtos.AccessRequestPageResponse(
        result.stream().map(this::toResponse).toList(),
        result.getNumber(),
        result.getSize(),
        result.getTotalElements(),
        result.getTotalPages()
    );
  }

  private Specification<AccessRequestEntity> byRequester(String requesterId) {
    return (root, query, builder) ->
        requesterId == null ? builder.conjunction() : builder.equal(root.get("requester").get("id"), requesterId);
  }

  private Specification<AccessRequestEntity> byStatus(String status) {
    if (!StringUtils.hasText(status) || "ALL".equalsIgnoreCase(status.trim())) {
      return (root, query, builder) -> builder.conjunction();
    }
    AccessRequestStatus requestedStatus;
    try {
      requestedStatus = AccessRequestStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw new BadRequestException("Status is invalid.");
    }
    return (root, query, builder) -> builder.equal(root.get("status"), requestedStatus);
  }

  private Specification<AccessRequestEntity> bySearch(String search) {
    if (!StringUtils.hasText(search)) {
      return (root, query, builder) -> builder.conjunction();
    }
    String term = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
    return (root, query, builder) -> builder.or(
        builder.like(builder.lower(root.get("requestNote")), term),
        builder.like(builder.lower(root.get("reviewNote")), term),
        builder.like(builder.lower(root.get("requester").get("fullName")), term),
        builder.like(builder.lower(root.get("requester").get("email")), term)
    );
  }

  private UserEntity requireUser(String userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
  }

  private AccessRequestEntity requirePendingRequesterOwnedRequest(String accessRequestId, AppUserDetails requesterDetails) {
    AccessRequestEntity entity = accessRequestRepository.findById(accessRequestId)
        .orElseThrow(() -> new ResourceNotFoundException("Access request not found"));
    if (!entity.getRequester().getId().equals(requesterDetails.getUserId())) {
      throw new ResourceNotFoundException("Access request not found");
    }
    if (entity.getStatus() != AccessRequestStatus.PENDING) {
      throw new BadRequestException("Only pending access requests can be changed.");
    }
    return entity;
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
