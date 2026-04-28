package com.fawnix.identity.access.controller;

import com.fawnix.identity.access.dto.AccessRequestDtos;
import com.fawnix.identity.access.service.AccessRequestService;
import com.fawnix.identity.security.service.AppUserDetails;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
  public List<AccessRequestDtos.AccessRequestResponse> listMyRequests(
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return accessRequestService.listMyRequests(userDetails);
  }

  @PostMapping
  public AccessRequestDtos.AccessRequestResponse submitRequest(
      @AuthenticationPrincipal AppUserDetails userDetails,
      @Valid @RequestBody AccessRequestDtos.SubmitAccessRequest request
  ) {
    return accessRequestService.submitRequest(userDetails, request);
  }

  @GetMapping
  @PreAuthorize("hasAuthority('ROLE_MASTER')")
  public List<AccessRequestDtos.AccessRequestResponse> listAllRequests(
      @RequestParam(required = false) String status
  ) {
    return accessRequestService.listAllRequests(status);
  }

  @PatchMapping("/{id}/review")
  @PreAuthorize("hasAuthority('ROLE_MASTER')")
  public AccessRequestDtos.AccessRequestResponse reviewRequest(
      @PathVariable String id,
      @AuthenticationPrincipal AppUserDetails userDetails,
      @Valid @RequestBody AccessRequestDtos.ReviewAccessRequest request
  ) {
    return accessRequestService.reviewRequest(id, request, userDetails);
  }
}
