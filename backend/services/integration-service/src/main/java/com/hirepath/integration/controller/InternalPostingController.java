package com.hirepath.integration.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.hirepath.integration.domain.PortalCredential;
import com.hirepath.integration.dto.PublishPostingRequest;
import com.hirepath.integration.dto.PublishPostingResponse;
import com.hirepath.integration.repository.PortalCredentialRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/postings")
public class InternalPostingController {

    private final PortalCredentialRepository credentialRepository;

    public InternalPostingController(PortalCredentialRepository credentialRepository) {
        this.credentialRepository = credentialRepository;
    }

    @PostMapping("/publish")
    public ResponseEntity<?> publish(@RequestBody PublishPostingRequest request) {
        if (request.getPlatforms() == null || request.getPlatforms().isEmpty()) {
            return ResponseEntity.badRequest().body("At least one platform is required");
        }

        List<PortalCredential.Platform> platforms = new ArrayList<>();
        for (String value : request.getPlatforms()) {
            try {
                platforms.add(PortalCredential.Platform.valueOf(value.toUpperCase()));
            } catch (Exception ex) {
                return ResponseEntity.badRequest().body("Invalid platform: " + value);
            }
        }

        List<PortalCredential> creds = credentialRepository.findByPlatformInAndActiveTrue(platforms);
        if (creds.size() != platforms.size()) {
            return ResponseEntity.badRequest().body("Missing active credentials for selected platforms");
        }

        String postingId = null;
        Map<String, Object> posting = request.getPosting();
        if (posting != null && posting.get("id") != null) {
            postingId = String.valueOf(posting.get("id"));
        }

        List<PublishPostingResponse.PublishPostingResult> results = new ArrayList<>();
        for (PortalCredential.Platform platform : platforms) {
            String externalUrl = postingId != null
                ? "https://" + platform.name().toLowerCase() + ".example.com/postings/" + postingId
                : null;
            results.add(new PublishPostingResponse.PublishPostingResult(
                platform.name().toLowerCase(),
                "published",
                externalUrl,
                null
            ));
        }

        return ResponseEntity.ok(new PublishPostingResponse(postingId, results));
    }
}
