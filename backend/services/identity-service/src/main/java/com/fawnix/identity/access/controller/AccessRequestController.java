package com.fawnix.identity.access.controller;

import com.fawnix.identity.access.dto.AccessRequestDtos;
import com.fawnix.identity.access.service.AccessRequestService;
import com.fawnix.identity.security.service.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/access-requests")
public class AccessRequestController {

  private final AccessRequestService accessRequestService;

  public AccessRequestController(AccessRequestService accessRequestService) {
    this.accessRequestService = accessRequestService;
  }

  @GetMapping("/me")
  public AccessRequestDtos.AccessRequestPageResponse listMyRequests(
      @AuthenticationPrincipal AppUserDetails userDetails,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String search,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int pageSize
  ) {
    return accessRequestService.listMyRequests(userDetails, status, search, page, pageSize);
  }

  @PostMapping
  public AccessRequestDtos.AccessRequestResponse submitRequest(
      @AuthenticationPrincipal AppUserDetails userDetails,
      @Valid @RequestBody AccessRequestDtos.SubmitAccessRequest request
  ) {
    return accessRequestService.submitRequest(userDetails, request);
  }

  @GetMapping("/{id}")
  public AccessRequestDtos.AccessRequestResponse getRequest(
      @PathVariable String id,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    boolean canReview = userDetails.getAuthorities().stream()
        .anyMatch(authority -> "feature.access.requests.review".equals(authority.getAuthority()));
    return accessRequestService.getRequest(id, userDetails, canReview);
  }

  @PatchMapping("/{id}")
  public AccessRequestDtos.AccessRequestResponse updateRequest(
      @PathVariable String id,
      @AuthenticationPrincipal AppUserDetails userDetails,
      @Valid @RequestBody AccessRequestDtos.UpdateAccessRequest request
  ) {
    return accessRequestService.updateRequest(id, request, userDetails);
  }

  @DeleteMapping("/{id}")
  public AccessRequestDtos.AccessRequestResponse cancelRequest(
      @PathVariable String id,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return accessRequestService.cancelRequest(id, userDetails);
  }

  @GetMapping
  @PreAuthorize("hasAuthority('feature.access.requests.review')")
  public AccessRequestDtos.AccessRequestPageResponse listAllRequests(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String search,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int pageSize
  ) {
    return accessRequestService.listAllRequests(status, search, page, pageSize);
  }

  @PatchMapping("/{id}/review")
  @PreAuthorize("hasAuthority('feature.access.requests.review')")
  public AccessRequestDtos.AccessRequestResponse reviewRequest(
      @PathVariable String id,
      @AuthenticationPrincipal AppUserDetails userDetails,
      @Valid @RequestBody AccessRequestDtos.ReviewAccessRequest request
  ) {
    return accessRequestService.reviewRequest(id, request, userDetails);
  }
}
