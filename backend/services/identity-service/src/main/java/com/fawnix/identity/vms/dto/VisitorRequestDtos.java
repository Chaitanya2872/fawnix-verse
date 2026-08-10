package com.fawnix.identity.vms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class VisitorRequestDtos {

  private VisitorRequestDtos() {
  }

  public record VisitorRequestCreateRequest(
      @NotBlank @Size(max = 160) String visitorFullName,
      @NotBlank @Email @Size(max = 180) String email,
      @NotBlank @Size(max = 32) String whatsappMobile,
      @Size(max = 180) String company,
      @NotBlank @Size(max = 160) String requestedByEmployeeName,
      @NotBlank @Size(max = 80) String purposeOfVisit,
      @Size(max = 500) String otherPurpose,
      @NotBlank String fromDateTime,
      @NotBlank String toDateTime
  ) {
  }

  public record VisitorDecisionRequest(
      Boolean approved,
      @Size(max = 1000) String rejectionReason
  ) {
  }

  public record VisitorQrVerificationRequest(
      @NotBlank String qrCodeData,
      String action
  ) {
  }

  public record VisitorRequestResponse(
      String id,
      String visitorId,
      String visitorFullName,
      String name,
      String email,
      String whatsappMobile,
      String mobile,
      String company,
      String requestedByEmployeeName,
      String employeeToMeet,
      String purposeOfVisit,
      String purpose,
      String otherPurpose,
      String fromDateTime,
      String toDateTime,
      String status,
      boolean arrived,
      Instant arrivedAt,
      Instant departedAt,
      String qrCodeData,
      String qrCodeUrl,
      boolean faceRegistered,
      int facePoses,
      String faceImageUrl,
      String registrationToken,
      String rejectionReason,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record VisitorStatisticsResponse(
      long totalRequests,
      long pendingRequests,
      long approvedRequests,
      long rejectedRequests,
      long currentlyArrived
  ) {
  }

  public record FaceRegistrationResponse(
      boolean success,
      String requestId,
      String visitorId,
      boolean faceRegistered,
      int facePoses,
      String faceImageUrl,
      String message
  ) {
  }

  public record FaceVerificationResponse(
      boolean verified,
      boolean matched,
      int confidence,
      String message
  ) {
  }

  public record VisitorListResponse(
      List<VisitorRequestResponse> visitors
  ) {
  }
}
