package com.fawnix.crm.contacts.service;

import com.fawnix.crm.accounts.entity.AccountEntity;
import com.fawnix.crm.accounts.repository.AccountRepository;
import com.fawnix.crm.common.exception.ResourceNotFoundException;
import com.fawnix.crm.contacts.dto.ContactDtos;
import com.fawnix.crm.contacts.entity.ContactEntity;
import com.fawnix.crm.contacts.mapper.ContactMapper;
import com.fawnix.crm.contacts.repository.ContactRepository;
import com.fawnix.crm.contacts.specification.ContactSpecifications;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContactService {

  private final ContactRepository contactRepository;
  private final AccountRepository accountRepository;
  private final ContactMapper contactMapper;

  public ContactService(
      ContactRepository contactRepository,
      AccountRepository accountRepository,
      ContactMapper contactMapper
  ) {
    this.contactRepository = contactRepository;
    this.accountRepository = accountRepository;
    this.contactMapper = contactMapper;
  }

  @Transactional(readOnly = true)
  public ContactDtos.PaginatedContactResponse getContacts(
      String search,
      String accountId,
      int page,
      int pageSize
  ) {
    int resolvedPage = Math.max(page, 1);
    int resolvedPageSize = Math.max(pageSize, 1);
    Page<ContactEntity> result = contactRepository.findAll(
        ContactSpecifications.withFilters(search, accountId),
        PageRequest.of(resolvedPage - 1, resolvedPageSize, Sort.by(Sort.Direction.DESC, "updatedAt"))
    );

    return new ContactDtos.PaginatedContactResponse(
        result.getContent().stream().map(contactMapper::toResponse).toList(),
        result.getTotalElements(),
        resolvedPage,
        resolvedPageSize,
        result.getTotalPages()
    );
  }

  @Transactional(readOnly = true)
  public ContactDtos.ContactResponse getContact(String id) {
    return contactMapper.toResponse(requireContact(id));
  }

  @Transactional
  public ContactDtos.ContactResponse createContact(ContactDtos.CreateContactRequest request) {
    Instant now = Instant.now();
    ContactEntity entity = new ContactEntity();
    entity.setId(UUID.randomUUID().toString());
    entity.setName(request.name().trim());
    entity.setEmail(trimToNull(request.email()));
    entity.setPhone(trimToNull(request.phone()));
    entity.setTitle(trimToNull(request.title()));
    entity.setSource(trimToNull(request.source()));
    entity.setAccount(resolveAccount(request.accountId()));
    entity.setCreatedAt(now);
    entity.setUpdatedAt(now);

    return contactMapper.toResponse(contactRepository.save(entity));
  }

  @Transactional
  public ContactDtos.ContactResponse updateContact(
      String id,
      ContactDtos.UpdateContactRequest request
  ) {
    ContactEntity entity = requireContact(id);
    if (request.name() != null) {
      entity.setName(request.name().trim());
    }
    if (request.email() != null) {
      entity.setEmail(trimToNull(request.email()));
    }
    if (request.phone() != null) {
      entity.setPhone(trimToNull(request.phone()));
    }
    if (request.title() != null) {
      entity.setTitle(trimToNull(request.title()));
    }
    if (request.source() != null) {
      entity.setSource(trimToNull(request.source()));
    }
    if (request.accountId() != null) {
      entity.setAccount(resolveAccount(request.accountId()));
    }
    entity.setUpdatedAt(Instant.now());
    return contactMapper.toResponse(contactRepository.save(entity));
  }

  @Transactional
  public void deleteContact(String id) {
    ContactEntity entity = requireContact(id);
    contactRepository.delete(entity);
  }

  private ContactEntity requireContact(String id) {
    return contactRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Contact not found."));
  }

  private AccountEntity resolveAccount(String accountId) {
    if (accountId == null || accountId.isBlank()) {
      return null;
    }
    return accountRepository.findById(accountId)
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
