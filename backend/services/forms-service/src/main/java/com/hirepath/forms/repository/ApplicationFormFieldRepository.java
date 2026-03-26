package com.hirepath.forms.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.forms.domain.ApplicationFormField;

public interface ApplicationFormFieldRepository extends JpaRepository<ApplicationFormField, UUID> {
    List<ApplicationFormField> findByForm_Id(UUID formId);
    void deleteByForm_Id(UUID formId);
}
