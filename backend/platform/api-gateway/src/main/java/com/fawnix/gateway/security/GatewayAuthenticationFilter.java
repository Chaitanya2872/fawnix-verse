package com.fawnix.gateway.security;

import java.util.List;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class GatewayAuthenticationFilter implements GlobalFilter, Ordered {

  private static final List<String> PUBLIC_PREFIXES = List.of(
      "/api/auth/login",
      "/api/auth/refresh",
      "/api/integrations/meta/webhook",
      "/api/integrations/whatsapp/webhook",
      "/actuator"
  );

  private final GatewayJwtService gatewayJwtService;

  public GatewayAuthenticationFilter(GatewayJwtService gatewayJwtService) {
    this.gatewayJwtService = gatewayJwtService;
  }

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    ServerHttpRequest request = exchange.getRequest();
    String path = request.getURI().getPath();

    if ("OPTIONS".equalsIgnoreCase(request.getMethod().name()) || isPublic(path)) {
      return chain.filter(exchange);
    }

    String authorization = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
    if (authorization == null || !authorization.startsWith("Bearer ")) {
      exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
      return exchange.getResponse().setComplete();
    }

    String token = authorization.substring(7);
    if (!gatewayJwtService.isTokenValid(token)) {
      exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
      return exchange.getResponse().setComplete();
    }

    return chain.filter(exchange);
  }

  @Override
  public int getOrder() {
    return Ordered.HIGHEST_PRECEDENCE;
  }

  private boolean isPublic(String path) {
    return PUBLIC_PREFIXES.stream().anyMatch(path::startsWith);
  }
}
