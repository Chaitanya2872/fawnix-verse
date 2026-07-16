package com.fawnix.procurement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fawnix.procurement.domain.Vendor;
import com.fawnix.procurement.domain.VendorStatus;
import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.dto.ProcurementDtos.VendorImportPreviewResult;
import com.fawnix.procurement.dto.ProcurementDtos.VendorImportResult;
import com.fawnix.procurement.repository.VendorRepository;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class VendorImportServiceTest {

  @Mock
  private VendorRepository vendorRepository;

  @Mock
  private VendorService vendorService;

  private VendorImportService vendorImportService;

  @BeforeEach
  void setUp() {
    vendorImportService = new VendorImportService(vendorRepository, vendorService);
  }

  private MockMultipartFile csvFile(String content) {
    return new MockMultipartFile(
        "file",
        "vendors.csv",
        "text/csv",
        content.getBytes(StandardCharsets.UTF_8)
    );
  }

  @Test
  void commitImport_createsNewVendorForValidRow() {
    when(vendorRepository.findFirstByEmailIgnoreCase("raj@acme.com")).thenReturn(Optional.empty());
    when(vendorService.createVendor(any())).thenReturn(null);

    MockMultipartFile file = csvFile(
        "display_name,email,mobile,gst_number\n"
            + "Acme Supplies,raj@acme.com,9876543210,27ABCDE1234F1Z5\n"
    );

    VendorImportResult result = vendorImportService.commitImport(file);

    assertThat(result.total()).isEqualTo(1);
    assertThat(result.created()).isEqualTo(1);
    assertThat(result.updated()).isZero();
    assertThat(result.failed()).isZero();
    assertThat(result.skipped()).isZero();

    verify(vendorService).createVendor(any(ProcurementDtos.CreateVendorRequest.class));
  }

  @Test
  void commitImport_updatesExistingVendorMatchedByEmail() {
    Vendor existing = new Vendor();
    existing.setId(UUID.randomUUID());
    existing.setVendorCode("VND-00001");
    existing.setVendorName("Old Name");
    existing.setStatus(VendorStatus.ACTIVE);
    when(vendorRepository.findFirstByEmailIgnoreCase("raj@acme.com")).thenReturn(Optional.of(existing));
    when(vendorRepository.existsByEmailIgnoreCaseAndIdNot("raj@acme.com", existing.getId())).thenReturn(false);

    MockMultipartFile file = csvFile(
        "display_name,email\n"
            + "Acme Supplies Updated,raj@acme.com\n"
    );

    VendorImportResult result = vendorImportService.commitImport(file);

    assertThat(result.created()).isZero();
    assertThat(result.updated()).isEqualTo(1);
    verify(vendorRepository).save(existing);
    verify(vendorService, never()).createVendor(any());
    assertThat(existing.getVendorName()).isEqualTo("Acme Supplies Updated");
  }

  @Test
  void commitImport_marksInvalidGstAsFailedWithoutPersisting() {
    MockMultipartFile file = csvFile(
        "display_name,gst_number\n"
            + "Acme Supplies,NOT-A-GST\n"
    );

    VendorImportResult result = vendorImportService.commitImport(file);

    assertThat(result.failed()).isEqualTo(1);
    assertThat(result.created()).isZero();
    assertThat(result.errors()).hasSize(1);
    verify(vendorService, never()).createVendor(any());
  }

  @Test
  void commitImport_skipsSecondRowWithDuplicateEmailWithinFile() {
    when(vendorRepository.findFirstByEmailIgnoreCase("raj@acme.com")).thenReturn(Optional.empty());
    when(vendorService.createVendor(any())).thenReturn(null);

    MockMultipartFile file = csvFile(
        "display_name,email\n"
            + "Acme Supplies,raj@acme.com\n"
            + "Acme Supplies Duplicate,raj@acme.com\n"
    );

    VendorImportResult result = vendorImportService.commitImport(file);

    assertThat(result.total()).isEqualTo(2);
    assertThat(result.created()).isEqualTo(1);
    assertThat(result.skipped()).isEqualTo(1);
    verify(vendorService, times(1)).createVendor(any());
  }

  @Test
  void previewImport_reportsCountsWithoutPersisting() {
    when(vendorRepository.findFirstByEmailIgnoreCase("raj@acme.com")).thenReturn(Optional.empty());

    MockMultipartFile file = csvFile(
        "display_name,email,gst_number\n"
            + "Acme Supplies,raj@acme.com,27ABCDE1234F1Z5\n"
            + ",noemail@acme.com,\n"
    );

    VendorImportPreviewResult result = vendorImportService.previewImport(file);

    assertThat(result.total()).isEqualTo(2);
    assertThat(result.valid()).isEqualTo(1);
    assertThat(result.invalid()).isEqualTo(1);
    verify(vendorService, never()).createVendor(any());
    verify(vendorRepository, never()).save(any());
  }
}
