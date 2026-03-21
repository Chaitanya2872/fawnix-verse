package com.fawnix.crm.accounts.mapper;

import com.fawnix.crm.accounts.dto.AccountDtos;
import com.fawnix.crm.accounts.entity.AccountEntity;
import org.springframework.stereotype.Component;

@Component
public class AccountMapper {

  public AccountDtos.AccountResponse toResponse(AccountEntity entity) {
    return new AccountDtos.AccountResponse(
        entity.getId(),
        entity.getName(),
        entity.getIndustry(),
        entity.getWebsite(),
        entity.getAddress(),
        entity.getOwnerUserId(),
        entity.getCreatedAt(),
        entity.getUpdatedAt()
    );
  }
}
