package com.hirepath.task.security.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security.jwt")
public class JwtProperties {

  private String issuer;
  private long accessTokenExpirationMinutes;
  private long refreshTokenExpirationDays;
  private String secret;

  public String getIssuer() {
    return issuer;
  }

  public void setIssuer(String issuer) {
    this.issuer = issuer;
  }

  public long getAccessTokenExpirationMinutes() {
    return accessTokenExpirationMinutes;
  }

  public void setAccessTokenExpirationMinutes(long accessTokenExpirationMinutes) {
    this.accessTokenExpirationMinutes = accessTokenExpirationMinutes;
  }

  public long getRefreshTokenExpirationDays() {
    return refreshTokenExpirationDays;
  }

  public void setRefreshTokenExpirationDays(long refreshTokenExpirationDays) {
    this.refreshTokenExpirationDays = refreshTokenExpirationDays;
  }

  public String getSecret() {
    return secret;
  }

  public void setSecret(String secret) {
    this.secret = secret;
  }
}
