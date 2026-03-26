package com.hirepath.recruitment.config;

import com.hirepath.recruitment.security.jwt.ServiceJwtProvider;
import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InternalServiceConfig {

  @Bean
  public RequestInterceptor internalServiceRequestInterceptor(
      @Value("${app.security.internal-service-secret:}") String secret,
      ServiceJwtProvider serviceJwtProvider
  ) {
    return template -> {
      template.header("X-Internal-Service-Secret", secret);
      template.header("Authorization", "Bearer " + serviceJwtProvider.getToken());
    };
  }
}
