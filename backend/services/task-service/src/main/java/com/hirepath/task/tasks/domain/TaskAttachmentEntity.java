package com.hirepath.task.tasks.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "task_attachments")
public class TaskAttachmentEntity {

  @Id
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "task_id", nullable = false)
  private TaskEntity task;

  @Column(name = "file_name", nullable = false, length = 255)
  private String fileName;

  @Column(name = "file_url", nullable = false, length = 500)
  private String fileUrl;

  @Column(name = "content_type", length = 120)
  private String contentType;

  @Column(name = "file_size")
  private Long fileSize;

  @Column(name = "uploaded_by_id", length = 64)
  private String uploadedById;

  @Column(name = "uploaded_by_name", length = 160)
  private String uploadedByName;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public TaskEntity getTask() { return task; }
  public void setTask(TaskEntity task) { this.task = task; }
  public String getFileName() { return fileName; }
  public void setFileName(String fileName) { this.fileName = fileName; }
  public String getFileUrl() { return fileUrl; }
  public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
  public String getContentType() { return contentType; }
  public void setContentType(String contentType) { this.contentType = contentType; }
  public Long getFileSize() { return fileSize; }
  public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
  public String getUploadedById() { return uploadedById; }
  public void setUploadedById(String uploadedById) { this.uploadedById = uploadedById; }
  public String getUploadedByName() { return uploadedByName; }
  public void setUploadedByName(String uploadedByName) { this.uploadedByName = uploadedByName; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
