package com.hirepath.approval.service;

import java.time.OffsetDateTime;
import java.util.List;

import com.hirepath.approval.domain.ApprovalRequestStage;
import com.hirepath.approval.domain.ApprovalStageStatus;
import com.hirepath.approval.repository.ApprovalRequestStageRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApprovalOverdueService {

    private final ApprovalRequestStageRepository stageRepository;
    private final ApprovalNotificationService notificationService;

    public ApprovalOverdueService(
        ApprovalRequestStageRepository stageRepository,
        ApprovalNotificationService notificationService
    ) {
        this.stageRepository = stageRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public int notifyOverdueStages() {
        OffsetDateTime now = OffsetDateTime.now();
        List<ApprovalRequestStage> stages = stageRepository.findOverdueStages(
            List.of(ApprovalStageStatus.PENDING, ApprovalStageStatus.IN_REVIEW),
            now
        );
        if (stages.isEmpty()) {
            return 0;
        }
        for (ApprovalRequestStage stage : stages) {
            if (stage.getRequest() == null) {
                continue;
            }
            notificationService.notifyOverdue(stage.getRequest(), stage);
            stage.setOverdueNotifiedAt(now);
        }
        stageRepository.saveAll(stages);
        return stages.size();
    }
}
