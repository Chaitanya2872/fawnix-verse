package com.hirepath.recruitment.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import feign.RequestInterceptor;

@Configuration
public class FeignConfig {

    @Bean
    public RequestInterceptor authHeaderInterceptor() {
        return template -> {
            // Internal service calls use X-Internal-Service-Secret via InternalServiceConfig.
        };
    }
}
