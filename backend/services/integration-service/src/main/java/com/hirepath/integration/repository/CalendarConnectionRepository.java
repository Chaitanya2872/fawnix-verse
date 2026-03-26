package com.hirepath.integration.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hirepath.integration.domain.CalendarConnection;
import com.hirepath.integration.domain.CalendarProvider;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarConnectionRepository extends JpaRepository<CalendarConnection, UUID> {
    Optional<CalendarConnection> findByProviderAndUserId(CalendarProvider provider, String userId);
    List<CalendarConnection> findAllByUserId(String userId);
    void deleteByProviderAndUserId(CalendarProvider provider, String userId);
}
