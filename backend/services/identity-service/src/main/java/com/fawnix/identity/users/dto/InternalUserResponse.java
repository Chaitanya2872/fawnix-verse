package com.fawnix.identity.users.dto;

import java.util.List;

public record InternalUserResponse(
    String id,
    String name,
    String email,
    boolean active,
    List<String> roles
) {
}
