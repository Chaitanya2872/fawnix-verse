package com.hirepath.org.client;

import com.hirepath.org.client.dto.UserSummaryResponse;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(name = "identity-service")
public interface IdentityClient {

    @GetMapping("/internal/users/summary")
    UserSummaryResponse summary();
}
