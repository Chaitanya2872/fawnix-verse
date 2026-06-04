package com.fawnix.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Instant;
import java.util.Base64;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Service;

@Service
public class GatewayJwtService {

  private final JwtProperties jwtProperties;

  public GatewayJwtService(JwtProperties jwtProperties) {
    this.jwtProperties = jwtProperties;
  }

  public boolean isTokenValid(String token) {
    for (String secret : getCandidateSecrets()) {
      try {
        Claims claims = Jwts.parser()
            .verifyWith((javax.crypto.SecretKey) getSigningKey(secret))
            .build()
            .parseSignedClaims(token)
            .getPayload();
        return claims.getExpiration().toInstant().isAfter(Instant.now());
      } catch (Exception exception) {
        // Try the next configured secret.
      }
    }
    return false;
  }

  private List<String> getCandidateSecrets() {
    List<String> secrets = new ArrayList<>();
    if (jwtProperties.getSecret() != null && !jwtProperties.getSecret().isBlank()) {
      secrets.add(jwtProperties.getSecret());
    }
    if (jwtProperties.getFawnixSecret() != null
        && !jwtProperties.getFawnixSecret().isBlank()
        && !jwtProperties.getFawnixSecret().equals(jwtProperties.getSecret())) {
      secrets.add(jwtProperties.getFawnixSecret());
    }
    return secrets;
  }

  private Key getSigningKey(String secret) {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
        secret.getBytes()
    )));
  }

  @ConfigurationProperties(prefix = "app.security.jwt")
  public static class JwtProperties {
    private String secret;
    private String fawnixSecret;

    public String getSecret() {
      return secret;
    }

    public void setSecret(String secret) {
      this.secret = secret;
    }

    public String getFawnixSecret() {
      return fawnixSecret;
    }

    public void setFawnixSecret(String fawnixSecret) {
      this.fawnixSecret = fawnixSecret;
    }
  }
}
