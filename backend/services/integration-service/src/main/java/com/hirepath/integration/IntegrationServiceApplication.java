package com.hirepath.integration;

import com.hirepath.integration.config.CalendarOAuthProperties;
import com.hirepath.integration.security.jwt.JwtProperties;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
@EnableConfigurationProperties({CalendarOAuthProperties.class, JwtProperties.class})
public class IntegrationServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(IntegrationServiceApplication.class, args);
    }
}
