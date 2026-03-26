package com.hirepath.analytics.security.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class InternalServiceAuthFilter extends OncePerRequestFilter {

  private final String internalServiceSecret;

  public InternalServiceAuthFilter(
      @Value("${app.security.internal-service-secret:}")
      String internalServiceSecret
  ) {
    this.internalServiceSecret = internalServiceSecret;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return path == null || !path.startsWith("/internal/");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    String provided = request.getHeader("X-Internal-Service-Secret");
    if (!Objects.equals(internalServiceSecret, provided)) {
      response.setStatus(HttpStatus.FORBIDDEN.value());
      return;
    }
    filterChain.doFilter(request, response);
  }
}
