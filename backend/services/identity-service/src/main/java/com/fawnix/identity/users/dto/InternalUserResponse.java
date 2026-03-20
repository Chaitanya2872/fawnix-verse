package com.fawnix.identity.users.dto;

import java.util.List;

public record InternalUserResponse(
    String id,
    String name,
    String email,
    String phoneNumber,
    boolean active,
    List<String> roles
) {
}
