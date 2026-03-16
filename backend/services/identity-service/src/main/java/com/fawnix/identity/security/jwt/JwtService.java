package com.fawnix.identity.security.jwt;

import com.fawnix.identity.security.service.AppUserDetails;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final JwtProperties jwtProperties;

  public JwtService(JwtProperties jwtProperties) {
    this.jwtProperties = jwtProperties;
  }

  public String generateAccessToken(AppUserDetails userDetails) {
    Instant now = Instant.now();
    Instant expiry = now.plus(jwtProperties.getAccessTokenExpirationMinutes(), ChronoUnit.MINUTES);

    return Jwts.builder()
        .subject(userDetails.getUserId())
        .issuer(jwtProperties.getIssuer())
        .issuedAt(Date.from(now))
        .expiration(Date.from(expiry))
        .claim("email", userDetails.getUsername())
        .claim("name", userDetails.getFullName())
        .claim("roles", userDetails.getRoleNames())
        .signWith(getSigningKey())
        .compact();
  }

  public Instant getAccessTokenExpiry() {
    return Instant.now().plus(jwtProperties.getAccessTokenExpirationMinutes(), ChronoUnit.MINUTES);
  }

  public Instant getRefreshTokenExpiry() {
    return Instant.now().plus(jwtProperties.getRefreshTokenExpirationDays(), ChronoUnit.DAYS);
  }

  public String extractUserId(String token) {
    return extractClaims(token).getSubject();
  }

  @SuppressWarnings("unchecked")
  public List<String> extractRoles(String token) {
    Object rawRoles = extractClaims(token).get("roles");
    if (rawRoles instanceof List<?> roles) {
      return roles.stream().map(String::valueOf).toList();
    }
    return List.of();
  }

  public boolean isTokenValid(String token, AppUserDetails userDetails) {
    Claims claims = extractClaims(token);
    return claims.getSubject().equalsIgnoreCase(userDetails.getUserId())
        && claims.getExpiration().toInstant().isAfter(Instant.now());
  }

  private Claims extractClaims(String token) {
    return Jwts.parser()
        .verifyWith((javax.crypto.SecretKey) getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }

  private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(toBase64Secret(jwtProperties.getSecret())));
  }

  private String toBase64Secret(String secret) {
    return java.util.Base64.getEncoder().encodeToString(secret.getBytes());
  }
}
