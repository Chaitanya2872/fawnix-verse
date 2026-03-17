package com.fawnix.crm.integrations.whatsapp;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadWhatsappQuestionnaireRepository extends JpaRepository<LeadWhatsappQuestionnaireEntity, String> {

  Optional<LeadWhatsappQuestionnaireEntity> findByLeadId(String leadId);

  Optional<LeadWhatsappQuestionnaireEntity> findFirstByPhoneAndCompletedAtIsNullOrderByUpdatedAtDesc(String phone);
}
