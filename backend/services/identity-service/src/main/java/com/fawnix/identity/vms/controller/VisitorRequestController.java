package com.fawnix.identity.vms.controller;

import com.fawnix.identity.vms.dto.VisitorRequestDtos.FaceVerificationResponse;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.VisitorDecisionRequest;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.VisitorQrVerificationRequest;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.VisitorRequestCreateRequest;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.VisitorRequestResponse;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.VisitorStatisticsResponse;
import com.fawnix.identity.vms.service.VisitorRequestService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/visitor-requests")
public class VisitorRequestController {

  private final VisitorRequestService visitorRequestService;

  public VisitorRequestController(VisitorRequestService visitorRequestService) {
    this.visitorRequestService = visitorRequestService;
  }

  @GetMapping
  public List<VisitorRequestResponse> list(@RequestParam(required = false) String filter) {
    return visitorRequestService.list(filter);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public VisitorRequestResponse create(@Valid @RequestBody VisitorRequestCreateRequest request) {
    return visitorRequestService.create(request);
  }

  @GetMapping("/{id}")
  public VisitorRequestResponse getById(@PathVariable String id) {
    return visitorRequestService.getById(id);
  }

  @GetMapping("/search")
  public List<VisitorRequestResponse> search(@RequestParam(defaultValue = "") String keyword) {
    return visitorRequestService.search(keyword);
  }

  @GetMapping("/statistics")
  public VisitorStatisticsResponse statistics() {
    return visitorRequestService.statistics();
  }

  @PostMapping("/{id}/approve")
  public VisitorRequestResponse approve(@PathVariable String id) {
    return visitorRequestService.approve(id);
  }

  @PostMapping("/{id}/reject")
  public VisitorRequestResponse reject(
      @PathVariable String id,
      @Valid @RequestBody(required = false) VisitorDecisionRequest request
  ) {
    return visitorRequestService.reject(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable String id) {
    visitorRequestService.delete(id);
  }

  @PostMapping("/verify-qr")
  public VisitorRequestResponse verifyQr(@Valid @RequestBody VisitorQrVerificationRequest request) {
    return visitorRequestService.verifyQr(request);
  }

  @PostMapping("/{id}/check-in")
  public VisitorRequestResponse checkIn(
      @PathVariable String id,
      @Valid @RequestBody(required = false) VisitorQrVerificationRequest request
  ) {
    return visitorRequestService.checkIn(id, request);
  }

  @PostMapping("/{id}/check-out")
  public VisitorRequestResponse checkOut(
      @PathVariable String id,
      @Valid @RequestBody(required = false) VisitorQrVerificationRequest request
  ) {
    return visitorRequestService.checkOut(id, request);
  }

  @PostMapping(value = "/{id}/verify-face", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public FaceVerificationResponse verifyFace(
      @PathVariable String id,
      @RequestParam(required = false) MultipartFile faceImage,
      @RequestParam(required = false) MultipartFile liveFaceImage,
      @RequestParam(required = false) String qrCodeData,
      @RequestParam(required = false) String visitorId
  ) {
    return visitorRequestService.verifyFace(id, qrCodeData, visitorId, pickFaceImage(liveFaceImage, faceImage));
  }

  private MultipartFile pickFaceImage(MultipartFile preferred, MultipartFile fallback) {
    return preferred != null && !preferred.isEmpty() ? preferred : fallback;
  }
}
