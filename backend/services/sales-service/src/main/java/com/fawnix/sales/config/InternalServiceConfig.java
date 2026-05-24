package com.fawnix.sales.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class InternalServiceConfig {

  @Bean
  public RestTemplate internalRestTemplate(
      RestTemplateBuilder builder,
      @Value("${app.security.internal-service-secret:}") String secret
  ) {
    return builder.additionalInterceptors((request, body, execution) -> {
      request.getHeaders().set("X-Internal-Service-Secret", secret);
      return execution.execute(request, body);
    }).build();
  }
}
