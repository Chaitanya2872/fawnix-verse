package com.hirepath.approval.client;

import com.hirepath.approval.client.dto.RecruitmentApprovalStatusRequest;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "recruitment-service")
public interface RecruitmentApprovalClient {

    @PostMapping("/internal/recruitment/approvals/status")
    void updateStatus(@RequestBody RecruitmentApprovalStatusRequest request);
}
