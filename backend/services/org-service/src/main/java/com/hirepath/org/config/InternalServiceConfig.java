package com.hirepath.org.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InternalServiceConfig {

  @Bean
  public RequestInterceptor internalServiceRequestInterceptor(
      @Value("${app.security.internal-service-secret:}") String secret
  ) {
    return template -> template.header("X-Internal-Service-Secret", secret);
  }
}
