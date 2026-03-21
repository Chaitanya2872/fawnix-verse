package com.fawnix.crm.deals.service;

import com.fawnix.crm.accounts.entity.AccountEntity;
import com.fawnix.crm.accounts.repository.AccountRepository;
import com.fawnix.crm.common.exception.ResourceNotFoundException;
import com.fawnix.crm.contacts.entity.ContactEntity;
import com.fawnix.crm.contacts.repository.ContactRepository;
import com.fawnix.crm.deals.dto.DealDtos;
import com.fawnix.crm.deals.entity.DealEntity;
import com.fawnix.crm.deals.mapper.DealMapper;
import com.fawnix.crm.deals.repository.DealRepository;
import com.fawnix.crm.deals.specification.DealSpecifications;
import com.fawnix.crm.leads.entity.LeadStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DealService {

  private final DealRepository dealRepository;
  private final AccountRepository accountRepository;
  private final ContactRepository contactRepository;
  private final DealMapper dealMapper;

  public DealService(
      DealRepository dealRepository,
      AccountRepository accountRepository,
      ContactRepository contactRepository,
      DealMapper dealMapper
  ) {
    this.dealRepository = dealRepository;
    this.accountRepository = accountRepository;
    this.contactRepository = contactRepository;
    this.dealMapper = dealMapper;
  }

  @Transactional(readOnly = true)
  public DealDtos.PaginatedDealResponse getDeals(
      String search,
      String stage,
      String ownerUserId,
      int page,
      int pageSize
  ) {
    int resolvedPage = Math.max(page, 1);
    int resolvedPageSize = Math.max(pageSize, 1);
    LeadStatus stageFilter = parseStageFilter(stage);

    Page<DealEntity> result = dealRepository.findAll(
        DealSpecifications.withFilters(search, stageFilter, ownerUserId),
        PageRequest.of(resolvedPage - 1, resolvedPageSize, Sort.by(Sort.Direction.DESC, "updatedAt"))
    );

    return new DealDtos.PaginatedDealResponse(
        result.getContent().stream().map(dealMapper::toResponse).toList(),
        result.getTotalElements(),
        resolvedPage,
        resolvedPageSize,
        result.getTotalPages()
    );
  }

  @Transactional(readOnly = true)
  public DealDtos.DealResponse getDeal(String id) {
    return dealMapper.toResponse(requireDeal(id));
  }

  @Transactional
  public DealDtos.DealResponse createDeal(DealDtos.CreateDealRequest request) {
    Instant now = Instant.now();
    DealEntity entity = new DealEntity();
    entity.setId(UUID.randomUUID().toString());
    entity.setName(request.name().trim());
    entity.setStage(parseStage(request.stage()));
    entity.setValue(request.value() != null ? request.value() : BigDecimal.ZERO);
    entity.setProbability(request.probability());
    entity.setExpectedCloseAt(request.expectedCloseAt());
    entity.setAccount(resolveAccount(request.accountId()));
    entity.setContact(resolveContact(request.contactId()));
    entity.setLeadId(trimToNull(request.leadId()));
    entity.setOwnerUserId(trimToNull(request.ownerUserId()));
    entity.setCreatedAt(now);
    entity.setUpdatedAt(now);

    return dealMapper.toResponse(dealRepository.save(entity));
  }

  @Transactional
  public DealDtos.DealResponse updateDeal(String id, DealDtos.UpdateDealRequest request) {
    DealEntity entity = requireDeal(id);
    if (request.name() != null) {
      entity.setName(request.name().trim());
    }
    if (request.stage() != null) {
      entity.setStage(parseStage(request.stage()));
    }
    if (request.value() != null) {
      entity.setValue(request.value());
    }
    if (request.probability() != null) {
      entity.setProbability(request.probability());
    }
    if (request.expectedCloseAt() != null) {
      entity.setExpectedCloseAt(request.expectedCloseAt());
    }
    if (request.accountId() != null) {
      entity.setAccount(resolveAccount(request.accountId()));
    }
    if (request.contactId() != null) {
      entity.setContact(resolveContact(request.contactId()));
    }
    if (request.leadId() != null) {
      entity.setLeadId(trimToNull(request.leadId()));
    }
    if (request.ownerUserId() != null) {
      entity.setOwnerUserId(trimToNull(request.ownerUserId()));
    }
    entity.setUpdatedAt(Instant.now());
    return dealMapper.toResponse(dealRepository.save(entity));
  }

  @Transactional
  public DealDtos.DealResponse updateStage(String id, DealDtos.UpdateDealStageRequest request) {
    DealEntity entity = requireDeal(id);
    entity.setStage(parseStage(request.stage()));
    entity.setUpdatedAt(Instant.now());
    return dealMapper.toResponse(dealRepository.save(entity));
  }

  @Transactional
  public void deleteDeal(String id) {
    DealEntity entity = requireDeal(id);
    dealRepository.delete(entity);
  }

  private DealEntity requireDeal(String id) {
    return dealRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Deal not found."));
  }

  private AccountEntity resolveAccount(String accountId) {
    if (accountId == null || accountId.isBlank()) {
      return null;
    }
    return accountRepository.findById(accountId)
        .orElseThrow(() -> new ResourceNotFoundException("Account not found."));
  }

  private ContactEntity resolveContact(String contactId) {
    if (contactId == null || contactId.isBlank()) {
      return null;
    }
    return contactRepository.findById(contactId)
        .orElseThrow(() -> new ResourceNotFoundException("Contact not found."));
  }

  private LeadStatus parseStage(String stage) {
    if (stage == null || stage.isBlank()) {
      return LeadStatus.NEW;
    }
    try {
      return LeadStatus.valueOf(stage.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      return LeadStatus.NEW;
    }
  }

  private LeadStatus parseStageFilter(String stage) {
    if (stage == null || stage.isBlank() || "ALL".equalsIgnoreCase(stage)) {
      return null;
    }
    return parseStage(stage);
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
