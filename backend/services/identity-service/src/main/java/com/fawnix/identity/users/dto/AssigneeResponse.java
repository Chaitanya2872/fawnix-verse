package com.fawnix.identity.users.dto;

public record AssigneeResponse(
    String id,
    String name,
    String email,
    String phoneNumber
) {
}
