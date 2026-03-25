package com.hirepath.integration.controller;

import java.net.URI;
import java.util.Map;

import com.hirepath.integration.domain.CalendarProvider;
import com.hirepath.integration.dto.CalendarAuthorizeRequest;
import com.hirepath.integration.dto.CalendarAuthorizationResponse;
import com.hirepath.integration.service.CalendarOAuthService;
import com.hirepath.integration.security.service.AppUserDetails;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/calendar/oauth")
public class CalendarOAuthController {

    private final CalendarOAuthService oauthService;

    public CalendarOAuthController(CalendarOAuthService oauthService) {
        this.oauthService = oauthService;
    }

    @PostMapping("/{provider}/authorize")
    public CalendarAuthorizationResponse authorize(
        @PathVariable String provider,
        @RequestBody(required = false) CalendarAuthorizeRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        if (user == null) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        CalendarProvider calendarProvider = CalendarProvider.fromValue(provider);
        String returnUrl = request != null ? request.getReturnUrl() : null;
        String authorizationUrl = oauthService.buildAuthorizationUrl(calendarProvider, user.getUserId(), returnUrl);
        return new CalendarAuthorizationResponse(authorizationUrl);
    }

    @GetMapping("/{provider}/callback")
    public ResponseEntity<?> callback(
        @PathVariable String provider,
        @RequestParam(name = "code", required = false) String code,
        @RequestParam(name = "state", required = false) String state,
        @RequestParam(name = "error", required = false) String error
    ) {
        if (error != null && !error.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", error));
        }
        CalendarProvider calendarProvider = CalendarProvider.fromValue(provider);
        String redirect = oauthService.handleCallback(calendarProvider, code, state);
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(redirect)).build();
    }
}
