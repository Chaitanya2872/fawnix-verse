package com.hirepath.recruitment.util;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import com.hirepath.recruitment.domain.UserRole;
import com.hirepath.recruitment.security.service.AppUserDetails;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class UserContext {

    private UserContext() {}

    public static String getUserId(AppUserDetails user) {
        return user != null ? user.getUserId() : null;
    }

    public static String getRole(AppUserDetails user) {
        if (user == null) {
            return null;
        }
        List<String> roles = getRoles(user);
        if (!roles.isEmpty()) {
            return roles.get(0);
        }
        return null;
    }

    public static boolean hasRole(AppUserDetails user, UserRole... roles) {
        if (user == null || roles == null || roles.length == 0) {
            return false;
        }
        List<String> roleValues = getRoles(user);
        return Arrays.stream(roles).anyMatch(role ->
            roleValues.stream().anyMatch(value -> value.equalsIgnoreCase(role.getValue()))
        );
    }

    public static void requireRole(AppUserDetails user, UserRole... roles) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        if (!hasRole(user, roles)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
    }

    private static List<String> getRoles(AppUserDetails user) {
        List<String> roles = user.getRoleNames();
        if (roles == null || roles.isEmpty()) {
            return List.of();
        }
        return roles.stream()
            .map(UserContext::normalizeRole)
            .filter(value -> value != null && !value.isBlank())
            .toList();
    }

    private static String normalizeRole(String role) {
        if (role == null) {
            return "";
        }
        String normalized = role.trim();
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring(5);
        }
        return normalized.toLowerCase(Locale.ENGLISH);
    }
}
