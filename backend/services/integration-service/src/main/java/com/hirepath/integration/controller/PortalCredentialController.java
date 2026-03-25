package com.hirepath.integration.controller;

import java.util.List;
import java.util.Map;

import com.hirepath.integration.domain.PortalCredential;
import com.hirepath.integration.dto.PortalCredentialRequest;
import com.hirepath.integration.dto.PortalCredentialResponse;
import com.hirepath.integration.repository.PortalCredentialRepository;

import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/portal-credentials")
public class PortalCredentialController {

    private final PortalCredentialRepository repository;

    public PortalCredentialController(PortalCredentialRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Map<String, List<PortalCredentialResponse>> list() {
        List<PortalCredentialResponse> data = repository.findAll(Sort.by(Sort.Direction.ASC, "platform")).stream()
            .map(this::toResponse)
            .toList();
        return Map.of("data", data);
    }

    @PostMapping
    public ResponseEntity<?> upsert(@RequestBody PortalCredentialRequest request) {
        PortalCredential.Platform platform;
        try {
            platform = PortalCredential.Platform.valueOf(request.getPlatform().toUpperCase());
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body("Invalid platform");
        }

        PortalCredential cred = repository.findByPlatform(platform).orElseGet(PortalCredential::new);
        cred.setPlatform(platform);
        if (request.getClientId() != null) cred.setClientId(request.getClientId());
        if (request.getClientSecret() != null) cred.setClientSecret(request.getClientSecret());
        if (request.getAccessToken() != null) cred.setAccessToken(request.getAccessToken());
        if (request.getRefreshToken() != null) cred.setRefreshToken(request.getRefreshToken());
        if (request.getExpiresAt() != null) cred.setExpiresAt(request.getExpiresAt());
        if (request.getAccountName() != null) cred.setAccountName(request.getAccountName());
        if (request.getIsActive() != null) cred.setActive(request.getIsActive());
        repository.save(cred);
        return ResponseEntity.ok(Map.of("message", "Credentials saved"));
    }

    private PortalCredentialResponse toResponse(PortalCredential credential) {
        return new PortalCredentialResponse(
            credential.getPlatform().name().toLowerCase(),
            credential.getClientId(),
            credential.getAccountName(),
            credential.isActive(),
            credential.getExpiresAt(),
            credential.getClientSecret() != null && !credential.getClientSecret().isBlank(),
            credential.getAccessToken() != null && !credential.getAccessToken().isBlank(),
            credential.getRefreshToken() != null && !credential.getRefreshToken().isBlank()
        );
    }
}
