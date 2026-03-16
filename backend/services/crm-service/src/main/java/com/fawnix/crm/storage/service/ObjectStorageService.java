package com.fawnix.crm.storage.service;

import com.fawnix.crm.common.exception.BadRequestException;
import com.fawnix.crm.storage.config.ObjectStorageProperties;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import java.io.InputStream;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ObjectStorageService {

  private final ObjectStorageProperties properties;
  private final MinioClient minioClient;

  public ObjectStorageService(ObjectStorageProperties properties) {
    this.properties = properties;
    this.minioClient = MinioClient.builder()
        .endpoint(properties.getEndpoint())
        .credentials(properties.getAccessKey(), properties.getSecretKey())
        .build();
  }

  public StoredObject store(String prefix, MultipartFile file) {
    String originalFileName = sanitizeFileName(file.getOriginalFilename());
    String extension = resolveExtension(originalFileName);
    String objectKey = buildObjectKey(prefix, extension);
    String contentType = file.getContentType() != null && !file.getContentType().isBlank()
        ? file.getContentType()
        : "application/octet-stream";

    try {
      ensureBucketExists();
      try (InputStream inputStream = file.getInputStream()) {
        minioClient.putObject(
            PutObjectArgs.builder()
                .bucket(properties.getBucket())
                .object(objectKey)
                .stream(inputStream, file.getSize(), -1)
                .contentType(contentType)
                .build()
        );
      }

      return new StoredObject(
          properties.getBucket(),
          objectKey,
          originalFileName,
          contentType,
          file.getSize()
      );
    } catch (Exception exception) {
      throw new BadRequestException("Failed to store the uploaded recording.");
    }
  }

  public void deleteIfExists(String objectKey) {
    if (objectKey == null || objectKey.isBlank()) {
      return;
    }

    try {
      minioClient.removeObject(
          RemoveObjectArgs.builder()
              .bucket(properties.getBucket())
              .object(objectKey)
              .build()
      );
    } catch (Exception ignored) {
      // Best-effort cleanup when downstream persistence fails.
    }
  }

  private void ensureBucketExists() throws Exception {
    boolean bucketExists = minioClient.bucketExists(
        BucketExistsArgs.builder()
            .bucket(properties.getBucket())
            .build()
    );

    if (!bucketExists && properties.isAutoCreateBucket()) {
      minioClient.makeBucket(
          MakeBucketArgs.builder()
              .bucket(properties.getBucket())
              .build()
      );
    }
  }

  private String buildObjectKey(String prefix, String extension) {
    String normalizedPrefix = prefix == null ? "" : prefix.trim().replace('\\', '/');
    normalizedPrefix = normalizedPrefix.replaceAll("^/+", "").replaceAll("/+$", "");
    String fileName = UUID.randomUUID() + extension;
    return normalizedPrefix.isEmpty() ? fileName : normalizedPrefix + "/" + fileName;
  }

  private String sanitizeFileName(String fileName) {
    if (fileName == null || fileName.isBlank()) {
      return "recording.webm";
    }

    String sanitized = Paths.get(fileName).getFileName().toString().trim();
    return sanitized.isEmpty() ? "recording.webm" : sanitized;
  }

  private String resolveExtension(String fileName) {
    int lastDot = fileName.lastIndexOf('.');
    if (lastDot < 0 || lastDot == fileName.length() - 1) {
      return ".webm";
    }

    return fileName.substring(lastDot).toLowerCase(Locale.ROOT);
  }

  public record StoredObject(
      String bucket,
      String objectKey,
      String originalFileName,
      String contentType,
      long size
  ) {
  }
}
