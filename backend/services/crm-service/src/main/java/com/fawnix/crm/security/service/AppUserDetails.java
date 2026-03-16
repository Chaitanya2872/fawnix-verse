package com.fawnix.crm.security.service;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class AppUserDetails implements UserDetails {

  private final String userId;
  private final String email;
  private final String fullName;
  private final List<String> roleNames;

  public AppUserDetails(String userId, String email, String fullName, List<String> roleNames) {
    this.userId = userId;
    this.email = email;
    this.fullName = fullName;
    this.roleNames = roleNames;
  }

  public String getUserId() {
    return userId;
  }

  public String getFullName() {
    return fullName;
  }

  public List<String> getRoleNames() {
    return roleNames;
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return roleNames.stream().map(SimpleGrantedAuthority::new).toList();
  }

  @Override
  public String getPassword() {
    return "";
  }

  @Override
  public String getUsername() {
    return email;
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return true;
  }
}
