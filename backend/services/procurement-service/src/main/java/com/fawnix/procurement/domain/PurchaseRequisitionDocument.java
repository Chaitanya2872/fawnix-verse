package com.fawnix.procurement.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "pr_documents")
public class PurchaseRequisitionDocument extends AuditableEntity {

  @Id
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "purchase_requisition_id", nullable = false)
  private PurchaseRequisition purchaseRequisition;

  @Enumerated(EnumType.STRING)
  @Column(name = "document_type", nullable = false, length = 20)
  private PurchaseRequisitionDocumentType documentType;

  @Column(name = "file_name", nullable = false, length = 255)
  private String fileName;

  @Column(name = "content_type", length = 120)
  private String contentType;

  @Column(name = "file_size", nullable = false)
  private long fileSize;

  @Column(name = "file_data", nullable = false, columnDefinition = "bytea")
  private byte[] fileData;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public PurchaseRequisition getPurchaseRequisition() {
    return purchaseRequisition;
  }

  public void setPurchaseRequisition(PurchaseRequisition purchaseRequisition) {
    this.purchaseRequisition = purchaseRequisition;
  }

  public PurchaseRequisitionDocumentType getDocumentType() {
    return documentType;
  }

  public void setDocumentType(PurchaseRequisitionDocumentType documentType) {
    this.documentType = documentType;
  }

  public String getFileName() {
    return fileName;
  }

  public void setFileName(String fileName) {
    this.fileName = fileName;
  }

  public String getContentType() {
    return contentType;
  }

  public void setContentType(String contentType) {
    this.contentType = contentType;
  }

  public long getFileSize() {
    return fileSize;
  }

  public void setFileSize(long fileSize) {
    this.fileSize = fileSize;
  }

  public byte[] getFileData() {
    return fileData;
  }

  public void setFileData(byte[] fileData) {
    this.fileData = fileData;
  }
}
