package com.fawnix.verse.security.service;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class AppUserDetails implements UserDetails {

  private final String userId;
  private final String email;
  private final String fullName;
  private final String passwordHash;
  private final boolean active;
  private final List<String> roleNames;

  public AppUserDetails(com.fawnix.verse.users.entity.UserEntity user) {
    this(
        user.getId(),
        user.getEmail(),
        user.getFullName(),
        user.getPasswordHash(),
        user.isActive(),
        user.getRoles().stream().map(role -> role.getName()).toList()
    );
  }

  public AppUserDetails(
      String userId,
      String email,
      String fullName,
      String passwordHash,
      boolean active,
      List<String> roleNames
  ) {
    this.userId = userId;
    this.email = email;
    this.fullName = fullName;
    this.passwordHash = passwordHash;
    this.active = active;
    this.roleNames = roleNames;
  }

  public String getUserId() {
    return userId;
  }

  public String getFullName() {
    return fullName;
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return roleNames.stream()
        .map(SimpleGrantedAuthority::new)
        .toList();
  }

  @Override
  public String getPassword() {
    return passwordHash;
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
    return active;
  }

  public List<String> getRoleNames() {
    return roleNames;
  }
}
