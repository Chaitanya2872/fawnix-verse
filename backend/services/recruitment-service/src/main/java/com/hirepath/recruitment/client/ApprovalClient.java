package com.hirepath.recruitment.client;

import com.hirepath.recruitment.client.dto.ApprovalFlowResponse;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "approval-service")
public interface ApprovalClient {

    @GetMapping("/internal/approval-flows/{id}")
    ApprovalFlowResponse getFlow(@PathVariable("id") String id);
}
