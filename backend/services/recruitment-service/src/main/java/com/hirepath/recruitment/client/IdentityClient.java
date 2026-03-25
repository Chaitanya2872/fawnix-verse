package com.hirepath.recruitment.client;

import com.hirepath.recruitment.client.dto.UserLookupRequest;
import com.hirepath.recruitment.client.dto.UserLookupResponse;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "identity-service")
public interface IdentityClient {

    @PostMapping("/internal/users/lookup")
    UserLookupResponse lookupUsers(@RequestBody UserLookupRequest request);
}
