package com.hirepath.recruitment.controller;

import java.time.OffsetDateTime;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import com.hirepath.recruitment.domain.CandidateApplication;
import com.hirepath.recruitment.domain.CandidateIntake;
import com.hirepath.recruitment.domain.CandidateStatus;
import com.hirepath.recruitment.domain.IntakeStatus;
import com.hirepath.recruitment.domain.UserRole;
import com.hirepath.recruitment.repository.ApplicationDecisionRepository;
import com.hirepath.recruitment.repository.CandidateApplicationRepository;
import com.hirepath.recruitment.repository.CandidateIntakeRepository;
import com.hirepath.recruitment.util.UserContext;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.hirepath.recruitment.security.service.AppUserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recruitment/analytics")
public class RecruitmentAnalyticsController {

    private final CandidateIntakeRepository intakeRepository;
    private final CandidateApplicationRepository applicationRepository;
    private final ApplicationDecisionRepository decisionRepository;

    public RecruitmentAnalyticsController(
        CandidateIntakeRepository intakeRepository,
        CandidateApplicationRepository applicationRepository,
        ApplicationDecisionRepository decisionRepository
    ) {
        this.intakeRepository = intakeRepository;
        this.applicationRepository = applicationRepository;
        this.decisionRepository = decisionRepository;
    }

    @GetMapping
    public ResponseEntity<?> dashboard(@AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER, UserRole.HIRING_MANAGER);
        List<CandidateIntake> intakes = intakeRepository.findAll();
        List<CandidateApplication> applications = applicationRepository.findAll();

        long intakeTotal = intakes.size();
        long shortlisted = intakes.stream().filter(i -> i.getStatus() == IntakeStatus.SHORTLISTED).count();
        long interviewStage = applications.stream().filter(app ->
            app.getStatus() == CandidateStatus.INTERVIEW_SCHEDULED || app.getStatus() == CandidateStatus.INTERVIEW_COMPLETED
        ).count();
        long decisionCount = decisionRepository.findAll().size();
        long approvedCount = applications.stream().filter(app -> app.getStatus() == CandidateStatus.SELECTED).count();
        long rejectedCount = applications.stream().filter(app -> app.getStatus() == CandidateStatus.REJECTED).count();

        double intakeToShortlist = ratio(shortlisted, intakeTotal);
        double shortlistToInterview = ratio(interviewStage, shortlisted);
        double interviewToDecision = ratio(decisionCount, interviewStage);
        double decisionToApproved = ratio(approvedCount, decisionCount);

        OffsetDateTime now = OffsetDateTime.now();

        Double avgIntakeToDecisionDays = averageDays(applications, true);

        Map<String, Object> summary = new java.util.LinkedHashMap<>();
        summary.put("intake_total", intakeTotal);
        summary.put("shortlisted", shortlisted);
        summary.put("interview", interviewStage);
        summary.put("decisions", decisionCount);
        summary.put("approved", approvedCount);
        summary.put("rejected", rejectedCount);

        Map<String, Object> conversions = new java.util.LinkedHashMap<>();
        conversions.put("intake_to_shortlist", intakeToShortlist);
        conversions.put("shortlist_to_interview", shortlistToInterview);
        conversions.put("interview_to_decision", interviewToDecision);
        conversions.put("decision_to_approved", decisionToApproved);

        Map<String, Object> velocity = new java.util.LinkedHashMap<>();
        velocity.put("intake_to_decision", avgIntakeToDecisionDays);
        velocity.put("decision_to_approved", null);

        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("summary", summary);
        response.put("conversion_rates", conversions);
        response.put("stage_velocity_days", velocity);
        response.put("generated_at", now);

        return ResponseEntity.ok(response);
    }

    private Double averageDays(List<CandidateApplication> applications, boolean useDecision) {
        long count = 0;
        double total = 0d;
        for (CandidateApplication application : applications) {
            if (application.getIntake() == null || application.getIntake().getCreatedAt() == null) {
                continue;
            }
            OffsetDateTime end = useDecision ? application.getDecisionAt() : null;
            if (end == null) {
                continue;
            }
            Duration duration = Duration.between(application.getIntake().getCreatedAt(), end);
            total += duration.toHours() / 24d;
            count++;
        }
        if (count == 0) return null;
        return total / count;
    }

    private double ratio(long numerator, long denominator) {
        if (denominator == 0) return 0d;
        return (double) numerator / (double) denominator;
    }
}
