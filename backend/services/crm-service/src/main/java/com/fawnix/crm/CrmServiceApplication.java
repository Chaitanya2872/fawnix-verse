package com.fawnix.crm;

import com.fawnix.crm.contact.config.ContactRecordingProperties;
import com.fawnix.crm.contact.config.SpeechToTextProperties;
import com.fawnix.crm.integrations.meta.MetaLeadProperties;
import com.fawnix.crm.integrations.whatsapp.WhatsappProperties;
import com.fawnix.crm.security.jwt.JwtProperties;
import com.fawnix.crm.storage.config.ObjectStorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({
    JwtProperties.class,
    ContactRecordingProperties.class,
    SpeechToTextProperties.class,
    ObjectStorageProperties.class,
    MetaLeadProperties.class,
    WhatsappProperties.class
})
public class CrmServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(CrmServiceApplication.class, args);
  }
}
