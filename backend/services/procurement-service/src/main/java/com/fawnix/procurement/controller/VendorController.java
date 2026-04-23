package com.fawnix.procurement.controller;

import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.service.VendorService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({"/procurement/vendors", "/vendors"})
public class VendorController {

  private final VendorService vendorService;

  public VendorController(VendorService vendorService) {
    this.vendorService = vendorService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProcurementDtos.VendorResponse createVendor(@Valid @RequestBody ProcurementDtos.CreateVendorRequest request) {
    return vendorService.createVendor(request);
  }

  @GetMapping
  public List<ProcurementDtos.VendorResponse> getVendors() {
    return vendorService.getVendors();
  }

  @GetMapping("/{id}")
  public ProcurementDtos.VendorResponse getVendor(@PathVariable UUID id) {
    return vendorService.getVendor(id);
  }

  @PutMapping("/{id}")
  public ProcurementDtos.VendorResponse updateVendor(
      @PathVariable UUID id,
      @Valid @RequestBody ProcurementDtos.UpdateVendorRequest request
  ) {
    return vendorService.updateVendor(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteVendor(@PathVariable UUID id) {
    vendorService.deleteVendor(id);
  }

  @GetMapping("/{id}/documents")
  public List<ProcurementDtos.VendorDocumentResponse> getVendorDocuments(@PathVariable UUID id) {
    return vendorService.getVendorDocuments(id);
  }

  @PostMapping(path = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public ProcurementDtos.VendorDocumentResponse uploadVendorDocument(
      @PathVariable UUID id,
      @RequestParam("file") MultipartFile file
  ) {
    return vendorService.uploadVendorDocument(id, file);
  }

  @GetMapping("/{vendorId}/documents/{documentId}/content")
  public ResponseEntity<ByteArrayResource> getVendorDocumentContent(
      @PathVariable UUID vendorId,
      @PathVariable UUID documentId
  ) {
    VendorService.VendorDocumentContent content = vendorService.getVendorDocumentContent(vendorId, documentId);
    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.inline().filename(content.fileName()).build().toString()
        )
        .contentType(content.mediaType())
        .contentLength(content.content().length)
        .body(new ByteArrayResource(content.content()));
  }

  @DeleteMapping("/{vendorId}/documents/{documentId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteVendorDocument(
      @PathVariable UUID vendorId,
      @PathVariable UUID documentId
  ) {
    vendorService.deleteVendorDocument(vendorId, documentId);
  }
}
