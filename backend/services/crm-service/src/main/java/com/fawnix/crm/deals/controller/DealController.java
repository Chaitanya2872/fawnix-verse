package com.fawnix.crm.deals.controller;

import com.fawnix.crm.deals.dto.DealDtos;
import com.fawnix.crm.deals.service.DealService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/deals")
public class DealController {

  private final DealService dealService;

  public DealController(DealService dealService) {
    this.dealService = dealService;
  }

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public DealDtos.PaginatedDealResponse getDeals(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "ALL") String stage,
      @RequestParam(defaultValue = "") String ownerUserId,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int pageSize
  ) {
    return dealService.getDeals(search, stage, ownerUserId, page, pageSize);
  }

  @GetMapping("/{id}")
  @PreAuthorize("isAuthenticated()")
  public DealDtos.DealResponse getDeal(@PathVariable String id) {
    return dealService.getDeal(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public DealDtos.DealResponse createDeal(@Valid @RequestBody DealDtos.CreateDealRequest request) {
    return dealService.createDeal(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public DealDtos.DealResponse updateDeal(
      @PathVariable String id,
      @Valid @RequestBody DealDtos.UpdateDealRequest request
  ) {
    return dealService.updateDeal(id, request);
  }

  @PatchMapping("/{id}/stage")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public DealDtos.DealResponse updateStage(
      @PathVariable String id,
      @Valid @RequestBody DealDtos.UpdateDealStageRequest request
  ) {
    return dealService.updateStage(id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public ResponseEntity<Void> deleteDeal(@PathVariable String id) {
    dealService.deleteDeal(id);
    return ResponseEntity.noContent().build();
  }
}
