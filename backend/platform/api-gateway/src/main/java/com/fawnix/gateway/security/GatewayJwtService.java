package com.fawnix.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Instant;
import java.util.Base64;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Service;

@Service
public class GatewayJwtService {

  private final JwtProperties jwtProperties;

  public GatewayJwtService(JwtProperties jwtProperties) {
    this.jwtProperties = jwtProperties;
  }

  public boolean isTokenValid(String token) {
    try {
      Claims claims = Jwts.parser()
          .verifyWith((javax.crypto.SecretKey) getSigningKey())
          .build()
          .parseSignedClaims(token)
          .getPayload();
      return claims.getExpiration().toInstant().isAfter(Instant.now());
    } catch (Exception exception) {
      return false;
    }
  }

  private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
        jwtProperties.getSecret().getBytes()
    )));
  }

  @ConfigurationProperties(prefix = "app.security.jwt")
  public static class JwtProperties {
    private String secret;

    public String getSecret() {
      return secret;
    }

    public void setSecret(String secret) {
      this.secret = secret;
    }
  }
}
