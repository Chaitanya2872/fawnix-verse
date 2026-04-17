package com.fawnix.procurement.security.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security.jwt")
public class JwtProperties {

  private String issuer;
  private int accessTokenExpirationMinutes;
  private int refreshTokenExpirationDays;
  private String secret;

  public String getIssuer() {
    return issuer;
  }

  public void setIssuer(String issuer) {
    this.issuer = issuer;
  }

  public int getAccessTokenExpirationMinutes() {
    return accessTokenExpirationMinutes;
  }

  public void setAccessTokenExpirationMinutes(int accessTokenExpirationMinutes) {
    this.accessTokenExpirationMinutes = accessTokenExpirationMinutes;
  }

  public int getRefreshTokenExpirationDays() {
    return refreshTokenExpirationDays;
  }

  public void setRefreshTokenExpirationDays(int refreshTokenExpirationDays) {
    this.refreshTokenExpirationDays = refreshTokenExpirationDays;
  }

  public String getSecret() {
    return secret;
  }

  public void setSecret(String secret) {
    this.secret = secret;
  }
}
