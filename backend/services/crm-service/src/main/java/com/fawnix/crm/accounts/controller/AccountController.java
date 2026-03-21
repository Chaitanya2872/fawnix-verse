package com.fawnix.crm.accounts.controller;

import com.fawnix.crm.accounts.dto.AccountDtos;
import com.fawnix.crm.accounts.service.AccountService;
import com.fawnix.crm.security.service.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/accounts")
public class AccountController {

  private final AccountService accountService;

  public AccountController(AccountService accountService) {
    this.accountService = accountService;
  }

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public AccountDtos.PaginatedAccountResponse getAccounts(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int pageSize
  ) {
    return accountService.getAccounts(search, page, pageSize);
  }

  @GetMapping("/{id}")
  @PreAuthorize("isAuthenticated()")
  public AccountDtos.AccountResponse getAccount(@PathVariable String id) {
    return accountService.getAccount(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public AccountDtos.AccountResponse createAccount(
      @Valid @RequestBody AccountDtos.CreateAccountRequest request,
      @AuthenticationPrincipal AppUserDetails userDetails
  ) {
    return accountService.createAccount(request, userDetails);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public AccountDtos.AccountResponse updateAccount(
      @PathVariable String id,
      @Valid @RequestBody AccountDtos.UpdateAccountRequest request
  ) {
    return accountService.updateAccount(id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public ResponseEntity<Void> deleteAccount(@PathVariable String id) {
    accountService.deleteAccount(id);
    return ResponseEntity.noContent().build();
  }
}
