package com.fawnix.crm.contacts.mapper;

import com.fawnix.crm.accounts.entity.AccountEntity;
import com.fawnix.crm.contacts.dto.ContactDtos;
import com.fawnix.crm.contacts.entity.ContactEntity;
import org.springframework.stereotype.Component;

@Component
public class ContactMapper {

  public ContactDtos.ContactResponse toResponse(ContactEntity entity) {
    AccountEntity account = entity.getAccount();
    ContactDtos.ContactAccountSummary summary = account != null
        ? new ContactDtos.ContactAccountSummary(account.getId(), account.getName())
        : null;

    return new ContactDtos.ContactResponse(
        entity.getId(),
        entity.getName(),
        entity.getEmail(),
        entity.getPhone(),
        entity.getTitle(),
        entity.getSource(),
        summary,
        entity.getCreatedAt(),
        entity.getUpdatedAt()
    );
  }
}
