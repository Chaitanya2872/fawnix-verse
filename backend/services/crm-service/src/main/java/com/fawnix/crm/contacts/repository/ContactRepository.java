package com.fawnix.crm.contacts.repository;

import com.fawnix.crm.contacts.entity.ContactEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ContactRepository extends JpaRepository<ContactEntity, String>,
    JpaSpecificationExecutor<ContactEntity> {
}
