package com.hirepath.org;

import com.hirepath.org.security.jwt.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
@EnableConfigurationProperties(JwtProperties.class)
public class OrgServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrgServiceApplication.class, args);
    }
}
