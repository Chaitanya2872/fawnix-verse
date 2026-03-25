package com.fawnix.identity.users.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.Map;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record UserSummaryResponse(
    int total,
    Map<String, Integer> byRole
) {
}
