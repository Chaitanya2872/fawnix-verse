package com.fawnix.crm.accounts.repository;

import com.fawnix.crm.accounts.entity.AccountEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AccountRepository extends JpaRepository<AccountEntity, String>,
    JpaSpecificationExecutor<AccountEntity> {
}
