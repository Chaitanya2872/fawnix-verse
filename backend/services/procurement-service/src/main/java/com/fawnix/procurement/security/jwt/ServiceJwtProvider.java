package com.fawnix.procurement.security.jwt;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ServiceJwtProvider {

  private final JwtProperties jwtProperties;
  private volatile String cachedToken;
  private volatile Instant cachedExpiry;

  public ServiceJwtProvider(JwtProperties jwtProperties) {
    this.jwtProperties = jwtProperties;
  }

  public String getToken() {
    Instant now = Instant.now();
    if (cachedToken != null && cachedExpiry != null && cachedExpiry.isAfter(now.plusSeconds(30))) {
      return cachedToken;
    }

    Instant expiry = now.plus(jwtProperties.getAccessTokenExpirationMinutes(), ChronoUnit.MINUTES);
    String token = Jwts.builder()
        .issuer(jwtProperties.getIssuer())
        .subject("procurement-service")
        .claim("email", "procurement-service@internal")
        .claim("name", "Procurement Service")
        .claim("roles", List.of("ROLE_SERVICE"))
        .claim("permissions", List.of())
        .issuedAt(Date.from(now))
        .expiration(Date.from(expiry))
        .signWith((javax.crypto.SecretKey) getSigningKey())
        .compact();

    cachedToken = token;
    cachedExpiry = expiry;
    return token;
  }

  private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
        jwtProperties.getSecret().getBytes()
    )));
  }
}
