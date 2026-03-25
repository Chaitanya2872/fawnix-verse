package com.hirepath.analytics.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        return Map.of(
            "open_positions", 0,
            "total_applications", 0,
            "pending_requests", 0,
            "hired_this_period", 0,
            "pipeline", Map.of()
        );
    }
}
