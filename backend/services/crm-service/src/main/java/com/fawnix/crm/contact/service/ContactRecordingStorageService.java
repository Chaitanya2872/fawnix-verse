package com.fawnix.crm.contact.service;

import com.fawnix.crm.contact.config.ContactRecordingProperties;
import com.fawnix.crm.storage.service.ObjectStorageService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ContactRecordingStorageService {

  private final ContactRecordingProperties properties;
  private final ObjectStorageService objectStorageService;

  public ContactRecordingStorageService(
      ContactRecordingProperties properties,
      ObjectStorageService objectStorageService
  ) {
    this.properties = properties;
    this.objectStorageService = objectStorageService;
  }

  public StoredAudioFile store(MultipartFile audioFile) {
    ObjectStorageService.StoredObject storedObject = objectStorageService.store(
        properties.getStoragePrefix(),
        audioFile
    );
    return new StoredAudioFile(
        storedObject.originalFileName(),
        storedObject.contentType(),
        storedObject.size(),
        storedObject.objectKey()
    );
  }

  public void deleteIfExists(String objectKey) {
    if (objectKey == null || objectKey.isBlank()) {
      return;
    }
    objectStorageService.deleteIfExists(objectKey);
  }

  public record StoredAudioFile(
      String originalFileName,
      String contentType,
      long size,
      String storagePath
  ) {
  }
}
