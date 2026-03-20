package com.fawnix.sales.quotes.controller;

import com.fawnix.sales.quotes.dto.QuoteDtos;
import com.fawnix.sales.quotes.service.QuoteService;
import com.fawnix.sales.security.service.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
@RequestMapping("/api/sales/quotes")
public class QuoteController {

  private final QuoteService quoteService;

  public QuoteController(QuoteService quoteService) {
    this.quoteService = quoteService;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public QuoteDtos.QuoteListResponse getQuotes(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "ALL") String status,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int pageSize
  ) {
    return quoteService.getQuotes(search, status, page, pageSize);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public QuoteDtos.QuoteResponse getQuote(@PathVariable String id) {
    return quoteService.getQuote(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public QuoteDtos.QuoteResponse createQuote(
      @Valid @RequestBody QuoteDtos.CreateQuoteRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return quoteService.createQuote(request, userDetails);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public QuoteDtos.QuoteResponse updateQuote(
      @PathVariable String id,
      @Valid @RequestBody QuoteDtos.UpdateQuoteRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return quoteService.updateQuote(id, request, userDetails);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public QuoteDtos.QuoteResponse updateStatus(
      @PathVariable String id,
      @Valid @RequestBody QuoteDtos.UpdateQuoteStatusRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return quoteService.updateStatus(id, request, userDetails);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public void deleteQuote(@PathVariable String id) {
    quoteService.deleteQuote(id);
  }
}
