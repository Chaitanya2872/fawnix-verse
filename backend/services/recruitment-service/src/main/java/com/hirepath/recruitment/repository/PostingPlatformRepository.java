package com.hirepath.recruitment.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.recruitment.domain.PortalPlatform;
import com.hirepath.recruitment.domain.PostingPlatform;

public interface PostingPlatformRepository extends JpaRepository<PostingPlatform, UUID> {
    Optional<PostingPlatform> findByPosting_IdAndPlatform(UUID postingId, PortalPlatform platform);
}
