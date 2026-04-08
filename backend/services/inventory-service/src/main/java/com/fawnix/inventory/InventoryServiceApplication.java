package com.fawnix.inventory;

import com.fawnix.inventory.security.jwt.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({
    JwtProperties.class
})
public class InventoryServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(InventoryServiceApplication.class, args);
  }
}
