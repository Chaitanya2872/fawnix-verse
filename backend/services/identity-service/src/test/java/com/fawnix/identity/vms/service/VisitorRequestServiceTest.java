package com.fawnix.identity.vms.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fawnix.identity.vms.dto.VisitorRequestDtos.VisitorQrVerificationRequest;
import com.fawnix.identity.vms.dto.VisitorRequestDtos.VisitorRequestCreateRequest;
import com.fawnix.identity.vms.repository.VisitorRequestRepository;
import com.fawnix.identity.vms.entity.VisitorRequestEntity;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.mock.web.MockMultipartFile;

class VisitorRequestServiceTest {

  private final Map<String, VisitorRequestEntity> store = new LinkedHashMap<>();
  private VisitorRequestService service;

  @BeforeEach
  void setUp() {
    VisitorRequestRepository repository = mock(VisitorRequestRepository.class);
    when(repository.save(any(VisitorRequestEntity.class))).thenAnswer(invocation -> {
      VisitorRequestEntity entity = invocation.getArgument(0);
      store.put(entity.getId(), entity);
      return entity;
    });
    when(repository.findById(any(String.class))).thenAnswer(invocation -> Optional.ofNullable(store.get(invocation.getArgument(0))));
    when(repository.findByVisitorId(any(String.class))).thenAnswer(invocation -> {
      String visitorId = invocation.getArgument(0);
      return store.values().stream().filter(entity -> visitorId.equals(entity.getVisitorId())).findFirst();
    });
    when(repository.findByQrCodeData(any(String.class))).thenAnswer(invocation -> {
      String qrCodeData = invocation.getArgument(0);
      return store.values().stream().filter(entity -> qrCodeData.equals(entity.getQrCodeData())).findFirst();
    });
    when(repository.findAll()).thenAnswer(invocation -> new ArrayList<>(store.values()));
    when(repository.findAll(any(Sort.class))).thenAnswer(invocation -> new ArrayList<>(store.values()));
    doAnswer(invocation -> {
      VisitorRequestEntity entity = invocation.getArgument(0);
      store.remove(entity.getId());
      return null;
    }).when(repository).delete(any(VisitorRequestEntity.class));

    service = new VisitorRequestService(repository);
  }

  @Test
  void completesVisitorCreationFaceRegistrationValidationAndDeskFlow() {
    LocalDateTime visitStart = LocalDateTime.now().minusMinutes(5);
    LocalDateTime visitEnd = LocalDateTime.now().plusHours(2);

    var created = service.create(new VisitorRequestCreateRequest(
        "Anika Rao",
        "anika.rao@example.com",
        "+91 9876543210",
        "Acme Systems",
        "Siva Kumari",
        "OFFICIAL_MEETING",
        null,
        visitStart.toString(),
        visitEnd.toString()
    ));

    assertThat(created.status()).isEqualTo("PENDING");
    assertThat(created.qrCodeData()).startsWith("VMS|");

    var approved = service.approve(created.id());
    assertThat(approved.status()).isEqualTo("APPROVED");

    MockMultipartFile faceImage = new MockMultipartFile(
        "faceImage",
        "face.jpg",
        "image/jpeg",
        new byte[] {1, 2, 3, 4, 5}
    );

    var registration = service.registerFace(created.id(), "front", faceImage, null);
    assertThat(registration.success()).isTrue();
    assertThat(registration.faceRegistered()).isTrue();
    assertThat(registration.facePoses()).isEqualTo(1);

    var qrValidation = service.verifyQr(new VisitorQrVerificationRequest(created.qrCodeData(), "CHECK_IN"));
    assertThat(qrValidation.id()).isEqualTo(created.id());

    MockMultipartFile liveImage = new MockMultipartFile(
        "faceImage",
        "live-face.jpg",
        "image/jpeg",
        new byte[] {1, 2, 3, 4, 5}
    );
    var verification = service.verifyFace(created.id(), created.qrCodeData(), created.visitorId(), liveImage);
    assertThat(verification.verified()).isTrue();
    assertThat(verification.confidence()).isEqualTo(99);

    var checkedIn = service.checkIn(created.id(), new VisitorQrVerificationRequest(created.qrCodeData(), "CHECK_IN"));
    assertThat(checkedIn.arrived()).isTrue();
    assertThat(checkedIn.status()).isEqualTo("APPROVED");
    assertThat(checkedIn.arrivedAt()).isNotNull();

    var checkedOut = service.checkOut(created.id(), new VisitorQrVerificationRequest(created.qrCodeData(), "CHECK_OUT"));
    assertThat(checkedOut.status()).isEqualTo("COMPLETED");
    assertThat(checkedOut.departedAt()).isNotNull();
  }
}
