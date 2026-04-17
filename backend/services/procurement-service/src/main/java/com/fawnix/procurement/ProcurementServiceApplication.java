package com.fawnix.procurement;

import com.fawnix.procurement.security.jwt.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
@EnableConfigurationProperties(JwtProperties.class)
public class ProcurementServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(ProcurementServiceApplication.class, args);
  }
}
