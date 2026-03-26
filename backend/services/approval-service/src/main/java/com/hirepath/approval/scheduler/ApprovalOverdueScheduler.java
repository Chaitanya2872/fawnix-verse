package com.hirepath.approval.scheduler;

import com.hirepath.approval.service.ApprovalOverdueService;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ApprovalOverdueScheduler {

    private final ApprovalOverdueService overdueService;

    public ApprovalOverdueScheduler(ApprovalOverdueService overdueService) {
        this.overdueService = overdueService;
    }

    @Scheduled(fixedDelayString = "${approvals.overdue.scan-ms:600000}")
    public void scanOverdue() {
        overdueService.notifyOverdueStages();
    }
}
