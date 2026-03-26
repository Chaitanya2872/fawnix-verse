package com.hirepath.org.client;

import com.hirepath.org.client.dto.ApprovalFlowSummaryResponse;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(name = "approval-service")
public interface ApprovalClient {

    @GetMapping("/internal/approval-flows/summary")
    ApprovalFlowSummaryResponse summary();
}
