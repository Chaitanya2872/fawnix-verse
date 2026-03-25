package com.hirepath.notifications;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;
import com.hirepath.notifications.security.jwt.JwtProperties;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
@EnableConfigurationProperties(JwtProperties.class)
public class NotificationsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(NotificationsServiceApplication.class, args);
    }
}
