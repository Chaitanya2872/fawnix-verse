package com.fawnix.procurement.controller;

import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.service.VendorService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/procurement/vendors")
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
}
