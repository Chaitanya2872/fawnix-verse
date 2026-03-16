package com.fawnix.identity.security.service;

import com.fawnix.identity.users.entity.UserEntity;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class AppUserDetails implements UserDetails {

  private final UserEntity user;

  public AppUserDetails(UserEntity user) {
    this.user = user;
  }

  public UserEntity getUser() {
    return user;
  }

  public String getUserId() {
    return user.getId();
  }

  public String getFullName() {
    return user.getFullName();
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return user.getRoles().stream()
        .map(role -> new SimpleGrantedAuthority(role.getName()))
        .toList();
  }

  @Override
  public String getPassword() {
    return user.getPasswordHash();
  }

  @Override
  public String getUsername() {
    return user.getEmail();
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
    return user.isActive();
  }

  public List<String> getRoleNames() {
    return user.getRoles().stream().map(role -> role.getName()).toList();
  }
}
