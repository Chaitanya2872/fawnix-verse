package com.hirepath.org.client.dto;

import java.util.Map;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class UserSummaryResponse {
    private int total;
    private Map<String, Integer> byRole;

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public Map<String, Integer> getByRole() {
        return byRole;
    }

    public void setByRole(Map<String, Integer> byRole) {
        this.byRole = byRole;
    }
}
