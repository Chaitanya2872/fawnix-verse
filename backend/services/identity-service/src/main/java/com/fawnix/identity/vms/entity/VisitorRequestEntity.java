package com.fawnix.identity.vms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "visitor_requests")
public class VisitorRequestEntity {

  @Id
  private String id;

  @Column(name = "visitor_id", nullable = false, unique = true, length = 40)
  private String visitorId;

  @Column(name = "visitor_full_name", nullable = false, length = 160)
  private String visitorFullName;

  @Column(nullable = false, length = 180)
  private String email;

  @Column(name = "whatsapp_mobile", nullable = false, length = 32)
  private String whatsappMobile;

  @Column(length = 180)
  private String company;

  @Column(name = "requested_by_employee_name", nullable = false, length = 160)
  private String requestedByEmployeeName;

  @Column(name = "purpose_of_visit", nullable = false, length = 80)
  private String purposeOfVisit;

  @Column(name = "other_purpose", length = 500)
  private String otherPurpose;

  @Column(name = "from_date_time", nullable = false)
  private LocalDateTime fromDateTime;

  @Column(name = "to_date_time", nullable = false)
  private LocalDateTime toDateTime;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private VisitorRequestStatus status;

  @Column(nullable = false)
  private boolean arrived;

  @Column(name = "arrived_at")
  private Instant arrivedAt;

  @Column(name = "departed_at")
  private Instant departedAt;

  @Column(name = "qr_code_data", nullable = false, columnDefinition = "text")
  private String qrCodeData;

  @Column(name = "qr_code_url", columnDefinition = "text")
  private String qrCodeUrl;

  @Column(name = "face_registered", nullable = false)
  private boolean faceRegistered;

  @Column(name = "face_poses", nullable = false)
  private int facePoses;

  @Column(name = "face_pose_ids", length = 300)
  private String facePoseIds;

  @Column(name = "face_image_data", columnDefinition = "text")
  private String faceImageData;

  @Column(name = "gov_id_image_data", columnDefinition = "text")
  private String govIdImageData;

  @Column(name = "registration_token", length = 80)
  private String registrationToken;

  @Column(name = "rejection_reason", length = 1000)
  private String rejectionReason;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public VisitorRequestEntity() {
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getVisitorId() {
    return visitorId;
  }

  public void setVisitorId(String visitorId) {
    this.visitorId = visitorId;
  }

  public String getVisitorFullName() {
    return visitorFullName;
  }

  public void setVisitorFullName(String visitorFullName) {
    this.visitorFullName = visitorFullName;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getWhatsappMobile() {
    return whatsappMobile;
  }

  public void setWhatsappMobile(String whatsappMobile) {
    this.whatsappMobile = whatsappMobile;
  }

  public String getCompany() {
    return company;
  }

  public void setCompany(String company) {
    this.company = company;
  }

  public String getRequestedByEmployeeName() {
    return requestedByEmployeeName;
  }

  public void setRequestedByEmployeeName(String requestedByEmployeeName) {
    this.requestedByEmployeeName = requestedByEmployeeName;
  }

  public String getPurposeOfVisit() {
    return purposeOfVisit;
  }

  public void setPurposeOfVisit(String purposeOfVisit) {
    this.purposeOfVisit = purposeOfVisit;
  }

  public String getOtherPurpose() {
    return otherPurpose;
  }

  public void setOtherPurpose(String otherPurpose) {
    this.otherPurpose = otherPurpose;
  }

  public LocalDateTime getFromDateTime() {
    return fromDateTime;
  }

  public void setFromDateTime(LocalDateTime fromDateTime) {
    this.fromDateTime = fromDateTime;
  }

  public LocalDateTime getToDateTime() {
    return toDateTime;
  }

  public void setToDateTime(LocalDateTime toDateTime) {
    this.toDateTime = toDateTime;
  }

  public VisitorRequestStatus getStatus() {
    return status;
  }

  public void setStatus(VisitorRequestStatus status) {
    this.status = status;
  }

  public boolean isArrived() {
    return arrived;
  }

  public void setArrived(boolean arrived) {
    this.arrived = arrived;
  }

  public Instant getArrivedAt() {
    return arrivedAt;
  }

  public void setArrivedAt(Instant arrivedAt) {
    this.arrivedAt = arrivedAt;
  }

  public Instant getDepartedAt() {
    return departedAt;
  }

  public void setDepartedAt(Instant departedAt) {
    this.departedAt = departedAt;
  }

  public String getQrCodeData() {
    return qrCodeData;
  }

  public void setQrCodeData(String qrCodeData) {
    this.qrCodeData = qrCodeData;
  }

  public String getQrCodeUrl() {
    return qrCodeUrl;
  }

  public void setQrCodeUrl(String qrCodeUrl) {
    this.qrCodeUrl = qrCodeUrl;
  }

  public boolean isFaceRegistered() {
    return faceRegistered;
  }

  public void setFaceRegistered(boolean faceRegistered) {
    this.faceRegistered = faceRegistered;
  }

  public int getFacePoses() {
    return facePoses;
  }

  public void setFacePoses(int facePoses) {
    this.facePoses = facePoses;
  }

  public String getFacePoseIds() {
    return facePoseIds;
  }

  public void setFacePoseIds(String facePoseIds) {
    this.facePoseIds = facePoseIds;
  }

  public String getFaceImageData() {
    return faceImageData;
  }

  public void setFaceImageData(String faceImageData) {
    this.faceImageData = faceImageData;
  }

  public String getGovIdImageData() {
    return govIdImageData;
  }

  public void setGovIdImageData(String govIdImageData) {
    this.govIdImageData = govIdImageData;
  }

  public String getRegistrationToken() {
    return registrationToken;
  }

  public void setRegistrationToken(String registrationToken) {
    this.registrationToken = registrationToken;
  }

  public String getRejectionReason() {
    return rejectionReason;
  }

  public void setRejectionReason(String rejectionReason) {
    this.rejectionReason = rejectionReason;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
