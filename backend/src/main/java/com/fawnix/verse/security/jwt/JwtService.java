package com.fawnix.verse.security.jwt;

import com.fawnix.verse.security.service.AppUserDetails;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Instant;
import java.util.Base64;
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
    Instant expiry = getAccessTokenExpiry();

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
    return Instant.now().plusSeconds((long) jwtProperties.getAccessTokenExpirationMinutes() * 60);
  }

  public Instant getRefreshTokenExpiry() {
    return Instant.now().plusSeconds((long) jwtProperties.getRefreshTokenExpirationDays() * 24 * 60 * 60);
  }

  public AppUserDetails toUserDetails(String token) {
    Claims claims = extractClaims(token);
    return new AppUserDetails(
        claims.getSubject(),
        String.valueOf(claims.get("email")),
        String.valueOf(claims.get("name")),
        "",
        true,
        extractRoles(claims)
    );
  }

  public boolean isTokenValid(String token) {
    try {
      return extractClaims(token).getExpiration().toInstant().isAfter(Instant.now());
    } catch (Exception exception) {
      return false;
    }
  }

  @SuppressWarnings("unchecked")
  private List<String> extractRoles(Claims claims) {
    Object rawRoles = claims.get("roles");
    if (rawRoles instanceof List<?> roles) {
      return roles.stream().map(String::valueOf).toList();
    }
    return List.of();
  }

  private Claims extractClaims(String token) {
    return Jwts.parser()
        .verifyWith((javax.crypto.SecretKey) getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }

  private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
        jwtProperties.getSecret().getBytes()
    )));
  }
}
