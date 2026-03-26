package com.hirepath.forms.security.jwt;

import com.hirepath.forms.security.service.AppUserDetails;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final JwtProperties jwtProperties;

  public JwtService(JwtProperties jwtProperties) {
    this.jwtProperties = jwtProperties;
  }

  public AppUserDetails toUserDetails(String token) {
    Claims claims = extractClaims(token);
    return new AppUserDetails(
        claims.getSubject(),
        String.valueOf(claims.get("email")),
        String.valueOf(claims.get("name")),
        extractRoles(claims),
        extractPermissions(claims)
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

  @SuppressWarnings("unchecked")
  private List<String> extractPermissions(Claims claims) {
    Object rawPermissions = claims.get("permissions");
    if (rawPermissions instanceof List<?> permissions) {
      return permissions.stream().map(String::valueOf).toList();
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
