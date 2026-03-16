package com.fawnix.crm;

import com.fawnix.crm.contact.config.ContactRecordingProperties;
import com.fawnix.crm.contact.config.SpeechToTextProperties;
import com.fawnix.crm.security.jwt.JwtProperties;
import com.fawnix.crm.storage.config.ObjectStorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({
    JwtProperties.class,
    ContactRecordingProperties.class,
    SpeechToTextProperties.class,
    ObjectStorageProperties.class
})
public class CrmServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(CrmServiceApplication.class, args);
  }
}
