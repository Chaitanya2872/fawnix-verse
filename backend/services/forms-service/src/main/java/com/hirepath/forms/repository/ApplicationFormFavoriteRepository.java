package com.hirepath.forms.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.forms.domain.ApplicationFormFavorite;

public interface ApplicationFormFavoriteRepository extends JpaRepository<ApplicationFormFavorite, UUID> {
    Optional<ApplicationFormFavorite> findByUserIdAndTemplateId(String userId, String templateId);
    List<ApplicationFormFavorite> findByUserId(String userId);
}
