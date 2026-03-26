package com.hirepath.integration.repository;

import com.hirepath.integration.domain.CalendarOAuthState;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarOAuthStateRepository extends JpaRepository<CalendarOAuthState, String> {
}
