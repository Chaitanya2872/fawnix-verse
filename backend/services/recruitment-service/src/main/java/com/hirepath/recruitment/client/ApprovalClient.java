package com.hirepath.recruitment.client;

import com.hirepath.recruitment.client.dto.ApprovalFlowResponse;
import com.hirepath.recruitment.client.dto.ApprovalRequestCreateRequest;
import com.hirepath.recruitment.client.dto.ApprovalRequestCreateResponse;
import com.hirepath.recruitment.client.dto.ApprovalStatusResponse;
import com.hirepath.recruitment.client.dto.InternalApprovalActionRequest;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "approval-service")
public interface ApprovalClient {

    @GetMapping("/internal/approval-flows/{id}")
    ApprovalFlowResponse getFlow(@PathVariable("id") String id);

    @PostMapping("/internal/approvals/requests")
    ApprovalRequestCreateResponse createApprovalRequest(@RequestBody ApprovalRequestCreateRequest request);

    @GetMapping("/internal/approvals/status")
    ApprovalStatusResponse getApprovalStatus(
        @RequestParam("module") String module,
        @RequestParam("entity_type") String entityType,
        @RequestParam("entity_id") String entityId
    );

    @PostMapping("/internal/approvals/requests/{id}/actions")
    void actOnApproval(@PathVariable("id") String id, @RequestBody InternalApprovalActionRequest request);
}
