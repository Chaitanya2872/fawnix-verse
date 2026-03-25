package com.hirepath.forms;

import com.hirepath.forms.security.jwt.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
@EnableConfigurationProperties(JwtProperties.class)
public class FormsServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(FormsServiceApplication.class, args);
    }
}
