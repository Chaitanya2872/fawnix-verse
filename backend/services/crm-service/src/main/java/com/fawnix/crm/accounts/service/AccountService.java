package com.fawnix.crm.accounts.service;

import com.fawnix.crm.accounts.dto.AccountDtos;
import com.fawnix.crm.accounts.entity.AccountEntity;
import com.fawnix.crm.accounts.mapper.AccountMapper;
import com.fawnix.crm.accounts.repository.AccountRepository;
import com.fawnix.crm.accounts.specification.AccountSpecifications;
import com.fawnix.crm.common.exception.ResourceNotFoundException;
import com.fawnix.crm.security.service.AppUserDetails;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

  private final AccountRepository accountRepository;
  private final AccountMapper accountMapper;

  public AccountService(AccountRepository accountRepository, AccountMapper accountMapper) {
    this.accountRepository = accountRepository;
    this.accountMapper = accountMapper;
  }

  @Transactional(readOnly = true)
  public AccountDtos.PaginatedAccountResponse getAccounts(String search, int page, int pageSize) {
    int resolvedPage = Math.max(page, 1);
    int resolvedPageSize = Math.max(pageSize, 1);
    Page<AccountEntity> result = accountRepository.findAll(
        AccountSpecifications.withFilters(search),
        PageRequest.of(resolvedPage - 1, resolvedPageSize, Sort.by(Sort.Direction.DESC, "updatedAt"))
    );

    return new AccountDtos.PaginatedAccountResponse(
        result.getContent().stream().map(accountMapper::toResponse).toList(),
        result.getTotalElements(),
        resolvedPage,
        resolvedPageSize,
        result.getTotalPages()
    );
  }

  @Transactional(readOnly = true)
  public AccountDtos.AccountResponse getAccount(String id) {
    return accountMapper.toResponse(requireAccount(id));
  }

  @Transactional
  public AccountDtos.AccountResponse createAccount(AccountDtos.CreateAccountRequest request, AppUserDetails actor) {
    Instant now = Instant.now();
    AccountEntity entity = new AccountEntity();
    entity.setId(UUID.randomUUID().toString());
    entity.setName(request.name().trim());
    entity.setIndustry(trimToNull(request.industry()));
    entity.setWebsite(trimToNull(request.website()));
    entity.setAddress(trimToNull(request.address()));
    entity.setOwnerUserId(request.ownerUserId() != null ? request.ownerUserId() : actor.getUserId());
    entity.setCreatedAt(now);
    entity.setUpdatedAt(now);

    return accountMapper.toResponse(accountRepository.save(entity));
  }

  @Transactional
  public AccountDtos.AccountResponse updateAccount(
      String id,
      AccountDtos.UpdateAccountRequest request
  ) {
    AccountEntity entity = requireAccount(id);
    if (request.name() != null) {
      entity.setName(request.name().trim());
    }
    if (request.industry() != null) {
      entity.setIndustry(trimToNull(request.industry()));
    }
    if (request.website() != null) {
      entity.setWebsite(trimToNull(request.website()));
    }
    if (request.address() != null) {
      entity.setAddress(trimToNull(request.address()));
    }
    if (request.ownerUserId() != null) {
      entity.setOwnerUserId(trimToNull(request.ownerUserId()));
    }
    entity.setUpdatedAt(Instant.now());
    return accountMapper.toResponse(accountRepository.save(entity));
  }

  @Transactional
  public void deleteAccount(String id) {
    AccountEntity entity = requireAccount(id);
    accountRepository.delete(entity);
  }

  private AccountEntity requireAccount(String id) {
    return accountRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Account not found."));
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
