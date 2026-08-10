package com.fawnix.identity.vms.controller;

import com.fawnix.identity.vms.dto.VisitorRequestDtos.FaceRegistrationResponse;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.FaceVerificationResponse;
import com.fawnix.identity.vms.service.VisitorRequestService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/public/visitor")
public class PublicVisitorController {

  private final VisitorRequestService visitorRequestService;

  public PublicVisitorController(VisitorRequestService visitorRequestService) {
    this.visitorRequestService = visitorRequestService;
  }

  @PostMapping(value = "/register-face", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public FaceRegistrationResponse registerFace(
      @RequestParam String requestId,
      @RequestParam(required = false) String pose,
      @RequestParam MultipartFile faceImage,
      @RequestParam(required = false) MultipartFile govIdImage
  ) {
    return visitorRequestService.registerFace(requestId, pose, faceImage, govIdImage);
  }

  @PostMapping(value = {"/verify-face", "/verify-face-match"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public FaceVerificationResponse verifyFace(
      @RequestParam(required = false) String requestId,
      @RequestParam(required = false) MultipartFile faceImage,
      @RequestParam(required = false) MultipartFile liveFaceImage,
      @RequestParam(required = false) String qrCodeData,
      @RequestParam(required = false) String visitorId
  ) {
    return visitorRequestService.verifyFace(requestId, qrCodeData, visitorId, pickFaceImage(liveFaceImage, faceImage));
  }

  private MultipartFile pickFaceImage(MultipartFile preferred, MultipartFile fallback) {
    return preferred != null && !preferred.isEmpty() ? preferred : fallback;
  }
}
