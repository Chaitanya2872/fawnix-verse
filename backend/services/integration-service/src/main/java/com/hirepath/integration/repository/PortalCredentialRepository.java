package com.hirepath.integration.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.integration.domain.PortalCredential;
import com.hirepath.integration.domain.PortalCredential.Platform;

public interface PortalCredentialRepository extends JpaRepository<PortalCredential, UUID> {
    Optional<PortalCredential> findByPlatform(Platform platform);
    List<PortalCredential> findByPlatformInAndActiveTrue(List<Platform> platforms);
}
