package com.fawnix.crm.contact.service;

import com.fawnix.crm.common.exception.BadRequestException;
import com.fawnix.crm.contact.config.ContactRecordingProperties;
import com.fawnix.crm.contact.entity.LeadContactRecordingEntity;
import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.security.service.AppUserDetails;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LeadContactRecordingService {

  private static final Set<String> FALLBACK_AUDIO_EXTENSIONS = Set.of(
      ".aac",
      ".m4a",
      ".mp3",
      ".ogg",
      ".wav",
      ".webm"
  );

  private final ContactRecordingProperties properties;
  private final ContactRecordingStorageService storageService;
  private final SpeechToTextClient speechToTextClient;

  public LeadContactRecordingService(
      ContactRecordingProperties properties,
      ContactRecordingStorageService storageService,
      SpeechToTextClient speechToTextClient
  ) {
    this.properties = properties;
    this.storageService = storageService;
    this.speechToTextClient = speechToTextClient;
  }

  public ProcessedContactRecording capture(
      LeadEntity lead,
      MultipartFile audioFile,
      AppUserDetails actor,
      Instant contactedAt
  ) {
    validateAudioFile(audioFile);

    SpeechToTextClient.TranscriptionResult transcription = speechToTextClient.transcribe(audioFile);
    ContactRecordingStorageService.StoredAudioFile storedFile = null;

    try {
      storedFile = storageService.store(audioFile);

      LeadContactRecordingEntity recording = new LeadContactRecordingEntity();
      recording.setId(UUID.randomUUID().toString());
      recording.setLead(lead);
      recording.setAudioFileName(storedFile.originalFileName());
      recording.setAudioContentType(storedFile.contentType());
      recording.setAudioSize(storedFile.size());
      recording.setAudioStoragePath(storedFile.storagePath());
      recording.setTranscript(transcription.transcript());
      recording.setRemarksSummary(transcription.remarksSummary());
      recording.setConversationSummary(transcription.conversationSummary());
      recording.setCreatedByUserId(actor.getUserId());
      recording.setCreatedByName(actor.getFullName());
      recording.setContactedAt(contactedAt);
      recording.setCreatedAt(contactedAt);
      lead.getContactRecordings().add(0, recording);

      return new ProcessedContactRecording(recording, buildRemarkContent(recording));
    } catch (RuntimeException exception) {
      if (storedFile != null) {
        storageService.deleteIfExists(storedFile.storagePath());
      }
      throw exception;
    }
  }

  public void deleteStoredRecordings(LeadEntity lead) {
    if (lead == null) {
      return;
    }

    for (LeadContactRecordingEntity recording : lead.getContactRecordings()) {
      String storagePath = recording.getAudioStoragePath();
      if (storagePath != null && !storagePath.isBlank()) {
        storageService.deleteIfExists(storagePath.trim());
      }
    }
  }

  private void validateAudioFile(MultipartFile audioFile) {
    if (audioFile == null || audioFile.isEmpty()) {
      throw new BadRequestException("An audio recording is required to move this lead to Contacted.");
    }

    if (audioFile.getSize() > properties.getMaxFileSizeBytes()) {
      long maxMegabytes = Math.max(properties.getMaxFileSizeBytes() / (1024 * 1024), 1);
      throw new BadRequestException("Audio recording exceeds the " + maxMegabytes + " MB limit.");
    }

    String contentType = audioFile.getContentType() != null
        ? audioFile.getContentType().trim().toLowerCase(Locale.ROOT)
        : "";
    if (contentType.startsWith("audio/")) {
      return;
    }

    String originalFileName = audioFile.getOriginalFilename();
    if (originalFileName != null) {
      String lowerCaseName = originalFileName.toLowerCase(Locale.ROOT);
      for (String extension : FALLBACK_AUDIO_EXTENSIONS) {
        if (lowerCaseName.endsWith(extension)) {
          return;
        }
      }
    }

    throw new BadRequestException("Please upload a supported audio recording.");
  }

  private String buildRemarkContent(LeadContactRecordingEntity recording) {
    StringBuilder builder = new StringBuilder();
    builder.append("Contact call summary:\n")
        .append(recording.getRemarksSummary().trim());

    if (recording.getConversationSummary() != null
        && !recording.getConversationSummary().isBlank()
        && !recording.getConversationSummary().trim().equals(recording.getRemarksSummary().trim())) {
      builder.append("\n\nConversation highlights:\n")
          .append(recording.getConversationSummary().trim());
    }

    return builder.toString();
  }

  public record ProcessedContactRecording(
      LeadContactRecordingEntity recording,
      String remarkContent
  ) {
  }
}
