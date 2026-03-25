package com.hirepath.analytics;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.openfeign.EnableFeignClients;
import com.hirepath.analytics.security.jwt.JwtProperties;

@SpringBootApplication
@EnableFeignClients
@EnableConfigurationProperties(JwtProperties.class)
public class AnalyticsServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AnalyticsServiceApplication.class, args);
    }
}
