package com.fawnix.crm.security.jwt;

import com.fawnix.crm.leads.service.IdentityUserClient;
import com.fawnix.crm.security.service.AppUserDetails;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import org.springframework.util.StringUtils;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final JwtProperties jwtProperties;
  private final IdentityUserClient identityUserClient;

  public JwtService(JwtProperties jwtProperties, IdentityUserClient identityUserClient) {
    this.jwtProperties = jwtProperties;
    this.identityUserClient = identityUserClient;
  }

  public AppUserDetails toUserDetails(String token) {
    Claims claims = extractClaims(token);
    if (isVerseToken(claims)) {
      return new AppUserDetails(
          claims.getSubject(),
          String.valueOf(claims.get("email")),
          String.valueOf(claims.get("name")),
          extractRoles(claims),
          extractPermissions(claims)
      );
    }

    String email = stringClaim(claims, "email");
    if (!StringUtils.hasText(email)) {
      throw new IllegalArgumentException("Fawnix token is missing email.");
    }

    IdentityUserClient.IdentityUser identityUser = identityUserClient.getAssignableUserByEmail(email);
    return new AppUserDetails(
        identityUser.id(),
        identityUser.email(),
        identityUser.name(),
        normalizeRoles(identityUser.roles()),
        List.of()
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
    for (String secret : getCandidateSecrets()) {
      try {
        return Jwts.parser()
            .verifyWith((javax.crypto.SecretKey) getSigningKey(secret))
            .build()
            .parseSignedClaims(token)
            .getPayload();
      } catch (Exception exception) {
        // Try the next configured secret.
      }
    }
    throw new IllegalArgumentException("Invalid token");
  }

  private boolean isVerseToken(Claims claims) {
    Object rawRoles = claims.get("roles");
    return rawRoles instanceof List<?>;
  }

  private List<String> normalizeRoles(List<String> roles) {
    if (roles == null) {
      return List.of();
    }
    List<String> normalized = new ArrayList<>();
    for (String role : roles) {
      if (!StringUtils.hasText(role)) {
        continue;
      }
      String trimmed = role.trim();
      normalized.add(trimmed.startsWith("ROLE_") ? trimmed : "ROLE_" + trimmed.toUpperCase());
    }
    return normalized;
  }

  private String stringClaim(Claims claims, String name) {
    Object value = claims.get(name);
    return value == null ? null : String.valueOf(value);
  }

  private List<String> getCandidateSecrets() {
    List<String> secrets = new ArrayList<>();
    if (StringUtils.hasText(jwtProperties.getSecret())) {
      secrets.add(jwtProperties.getSecret());
    }
    if (StringUtils.hasText(jwtProperties.getFawnixSecret())
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
}
