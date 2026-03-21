package com.fawnix.crm.deals.mapper;

import com.fawnix.crm.accounts.entity.AccountEntity;
import com.fawnix.crm.contacts.entity.ContactEntity;
import com.fawnix.crm.deals.dto.DealDtos;
import com.fawnix.crm.deals.entity.DealEntity;
import org.springframework.stereotype.Component;

@Component
public class DealMapper {

  public DealDtos.DealResponse toResponse(DealEntity entity) {
    AccountEntity account = entity.getAccount();
    ContactEntity contact = entity.getContact();

    DealDtos.DealAccountSummary accountSummary = account != null
        ? new DealDtos.DealAccountSummary(account.getId(), account.getName())
        : null;
    DealDtos.DealContactSummary contactSummary = contact != null
        ? new DealDtos.DealContactSummary(contact.getId(), contact.getName(), contact.getEmail(), contact.getPhone())
        : null;

    return new DealDtos.DealResponse(
        entity.getId(),
        entity.getName(),
        entity.getStage().name(),
        entity.getValue(),
        entity.getProbability(),
        entity.getExpectedCloseAt(),
        accountSummary,
        contactSummary,
        entity.getLeadId(),
        entity.getOwnerUserId(),
        entity.getCreatedAt(),
        entity.getUpdatedAt()
    );
  }
}
