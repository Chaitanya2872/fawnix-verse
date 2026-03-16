package com.fawnix.verse.security.service;

import com.fawnix.verse.common.exception.ResourceNotFoundException;
import com.fawnix.verse.users.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {

  private final UserRepository userRepository;

  public AppUserDetailsService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    return userRepository.findByEmailIgnoreCase(username)
        .map(AppUserDetails::new)
        .orElseThrow(() -> new UsernameNotFoundException("User not found"));
  }

  public AppUserDetails loadByEmail(String email) {
    return userRepository.findByEmailIgnoreCase(email)
        .map(AppUserDetails::new)
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
  }
}
