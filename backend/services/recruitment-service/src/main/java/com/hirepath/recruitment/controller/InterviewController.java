package com.hirepath.recruitment.controller;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hirepath.recruitment.client.IdentityClient;
import com.hirepath.recruitment.client.IntegrationClient;
import com.hirepath.recruitment.client.dto.CalendarEventRequest;
import com.hirepath.recruitment.client.dto.CalendarEventResponse;
import com.hirepath.recruitment.client.dto.CalendarEventUpdateRequest;
import com.hirepath.recruitment.client.dto.UserLookupRequest;
import com.hirepath.recruitment.client.dto.UserLookupResponse;
import com.hirepath.recruitment.domain.Candidate;
import com.hirepath.recruitment.domain.CandidateApplication;
import com.hirepath.recruitment.domain.EvaluationScore;
import com.hirepath.recruitment.domain.Interview;
import com.hirepath.recruitment.domain.InterviewFeedback;
import com.hirepath.recruitment.domain.InterviewMode;
import com.hirepath.recruitment.domain.InterviewPanel;
import com.hirepath.recruitment.domain.InterviewType;
import com.hirepath.recruitment.domain.UserRole;
import com.hirepath.recruitment.dto.InterviewCreateRequest;
import com.hirepath.recruitment.dto.InterviewFeedbackRequest;
import com.hirepath.recruitment.dto.InterviewUpdateRequest;
import com.hirepath.recruitment.repository.CandidateApplicationRepository;
import com.hirepath.recruitment.repository.EvaluationScoreRepository;
import com.hirepath.recruitment.repository.InterviewFeedbackRepository;
import com.hirepath.recruitment.repository.InterviewPanelRepository;
import com.hirepath.recruitment.repository.InterviewRepository;
import com.hirepath.recruitment.service.RecruitmentEventService;
import com.hirepath.recruitment.util.UserContext;

import feign.FeignException;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.hirepath.recruitment.security.service.AppUserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    private final InterviewRepository interviewRepository;
    private final InterviewPanelRepository interviewPanelRepository;
    private final InterviewFeedbackRepository interviewFeedbackRepository;
    private final EvaluationScoreRepository evaluationScoreRepository;
    private final CandidateApplicationRepository candidateApplicationRepository;
    private final IntegrationClient integrationClient;
    private final IdentityClient identityClient;
    private final RecruitmentEventService eventService;

    public InterviewController(
        InterviewRepository interviewRepository,
        InterviewPanelRepository interviewPanelRepository,
        InterviewFeedbackRepository interviewFeedbackRepository,
        EvaluationScoreRepository evaluationScoreRepository,
        CandidateApplicationRepository candidateApplicationRepository,
        IntegrationClient integrationClient,
        IdentityClient identityClient,
        RecruitmentEventService eventService
    ) {
        this.interviewRepository = interviewRepository;
        this.interviewPanelRepository = interviewPanelRepository;
        this.interviewFeedbackRepository = interviewFeedbackRepository;
        this.evaluationScoreRepository = evaluationScoreRepository;
        this.candidateApplicationRepository = candidateApplicationRepository;
        this.integrationClient = integrationClient;
        this.identityClient = identityClient;
        this.eventService = eventService;
    }

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER);
        List<Interview> interviews = interviewRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Map<String, Object>> data = interviews.stream().map(interview -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", interview.getId());
            row.put("application_id", interview.getApplication() != null ? interview.getApplication().getId() : null);
            CandidateApplication application = interview.getApplication();
            Candidate candidate = application != null ? application.getCandidate() : null;
            row.put("candidate_id", candidate != null ? candidate.getId() : null);
            row.put("candidate_name", candidate != null ? candidate.getFullName() : null);
            row.put("position_title", application != null && application.getPosition() != null ? application.getPosition().getTitle() : null);
            row.put("round_number", interview.getRoundNumber());
            row.put("interview_type", interview.getInterviewType() != null ? interview.getInterviewType().getValue() : null);
            row.put("mode", interview.getMode() != null ? interview.getMode().getValue() : null);
            row.put("scheduled_at", interview.getScheduledAt());
            row.put("duration_minutes", interview.getDurationMinutes());
            row.put("location", interview.getLocation());
            row.put("meeting_link", interview.getMeetingLink());
            row.put("calendar_provider", interview.getCalendarProvider());
            row.put("calendar_event_id", interview.getCalendarEventId());
            row.put("status", interview.getStatus());
            row.put("created_at", interview.getCreatedAt());
            row.put("interviewers", interview.getInterviewers().stream().map(panel -> Map.of(
                "id", panel.getId(),
                "interviewer_id", panel.getInterviewerId(),
                "role", panel.getRole()
            )).toList());
            row.put("feedback", interview.getFeedback().stream().map(fb -> Map.of(
                "id", fb.getId(),
                "interviewer_id", fb.getInterviewerId(),
                "overall_score", fb.getOverallScore(),
                "recommendation", fb.getRecommendation(),
                "submitted_at", fb.getSubmittedAt()
            )).toList());
            return row;
        }).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER);
        Interview interview = interviewRepository.findById(UUID.fromString(id)).orElse(null);
        if (interview == null) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", interview.getId());
        row.put("application_id", interview.getApplication() != null ? interview.getApplication().getId() : null);
        row.put("round_number", interview.getRoundNumber());
        row.put("interview_type", interview.getInterviewType() != null ? interview.getInterviewType().getValue() : null);
        row.put("mode", interview.getMode() != null ? interview.getMode().getValue() : null);
        row.put("scheduled_at", interview.getScheduledAt());
        row.put("duration_minutes", interview.getDurationMinutes());
        row.put("location", interview.getLocation());
        row.put("meeting_link", interview.getMeetingLink());
        row.put("calendar_provider", interview.getCalendarProvider());
        row.put("calendar_event_id", interview.getCalendarEventId());
        row.put("status", interview.getStatus());
        row.put("created_at", interview.getCreatedAt());
        row.put("interviewers", interview.getInterviewers().stream().map(panel -> Map.of(
            "id", panel.getId(),
            "interviewer_id", panel.getInterviewerId(),
            "role", panel.getRole()
        )).toList());
        row.put("feedback", interview.getFeedback().stream().map(fb -> {
            Map<String, Object> feedback = new LinkedHashMap<>();
            feedback.put("id", fb.getId());
            feedback.put("interviewer_id", fb.getInterviewerId());
            feedback.put("technical_score", fb.getTechnicalScore());
            feedback.put("communication_score", fb.getCommunicationScore());
            feedback.put("cultural_score", fb.getCulturalScore());
            feedback.put("overall_score", fb.getOverallScore());
            feedback.put("strengths", fb.getStrengths());
            feedback.put("weaknesses", fb.getWeaknesses());
            feedback.put("notes", fb.getNotes());
            feedback.put("recommendation", fb.getRecommendation());
            feedback.put("submitted_at", fb.getSubmittedAt());
            return feedback;
        }).toList());
        return ResponseEntity.ok(row);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> create(@RequestBody InterviewCreateRequest request, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        if (request.getApplicationId() == null || request.getApplicationId().isBlank()) {
            return ResponseEntity.badRequest().body("application_id is required");
        }
        CandidateApplication application = candidateApplicationRepository
            .findById(UUID.fromString(request.getApplicationId()))
            .orElse(null);
        if (application == null) {
            return ResponseEntity.badRequest().body("Invalid application_id");
        }

        Interview interview = new Interview();
        interview.setApplication(application);
        interview.setRoundNumber(request.getRoundNumber() != null ? request.getRoundNumber() : 1);
        if (request.getInterviewType() != null) {
            try {
                interview.setInterviewType(InterviewType.fromValue(request.getInterviewType()));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body("Invalid interview_type");
            }
        }
        if (request.getMode() != null) {
            try {
                interview.setMode(InterviewMode.fromValue(request.getMode()));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body("Invalid mode");
            }
        }
        if (request.getScheduledAt() != null && !request.getScheduledAt().isBlank()) {
            interview.setScheduledAt(OffsetDateTime.parse(request.getScheduledAt()));
        }
        if (request.getDurationMinutes() != null) {
            interview.setDurationMinutes(request.getDurationMinutes());
        }
        interview.setLocation(request.getLocation());
        interview.setMeetingLink(request.getMeetingLink());
        interview.setCalendarProvider(normalizeProvider(request.getCalendarProvider()));
        interview.setCalendarEventId(request.getCalendarEventId());
        interview.setStatus("scheduled");
        Interview saved = interviewRepository.save(interview);

        if (request.getInterviewers() != null) {
            for (InterviewCreateRequest.InterviewerRequest panelReq : request.getInterviewers()) {
                InterviewPanel panel = new InterviewPanel();
                panel.setInterview(saved);
                panel.setInterviewerId(panelReq.getInterviewerId());
                panel.setRole(panelReq.getRole());
                interviewPanelRepository.save(panel);
            }
        }

        if (shouldSyncCalendar(saved, request.getScheduledAt())) {
            try {
                CalendarEventResponse eventResponse = integrationClient.createCalendarEvent(
                    buildCalendarRequest(saved, request.getScheduledAt(), request.getDurationMinutes(), request.getMode(), user, request.getInterviewers())
                );
                saved.setCalendarProvider(normalizeProvider(request.getCalendarProvider()));
                saved.setCalendarEventId(eventResponse.getEventId());
                if (saved.getMeetingLink() == null && eventResponse.getMeetingLink() != null) {
                    saved.setMeetingLink(eventResponse.getMeetingLink());
                }
                interviewRepository.save(saved);
            } catch (FeignException ex) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.contentUTF8());
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", saved.getId(), "message", "Interview scheduled"));
    }

    @PatchMapping("/{id}")
    @Transactional
    public ResponseEntity<?> update(
        @PathVariable String id,
        @RequestBody InterviewUpdateRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER);
        Interview interview = interviewRepository.findById(UUID.fromString(id)).orElse(null);
        if (interview == null) {
            return ResponseEntity.notFound().build();
        }
        if (request.getScheduledAt() != null) {
            interview.setScheduledAt(request.getScheduledAt().isBlank() ? null : OffsetDateTime.parse(request.getScheduledAt()));
        }
        if (request.getDurationMinutes() != null) {
            interview.setDurationMinutes(request.getDurationMinutes());
        }
        if (request.getLocation() != null) {
            interview.setLocation(request.getLocation());
        }
        if (request.getMeetingLink() != null) {
            interview.setMeetingLink(request.getMeetingLink());
        }
        if (request.getStatus() != null) {
            interview.setStatus(request.getStatus());
        }
        boolean cancelEvent = request.getStatus() != null && isCanceled(request.getStatus());
        boolean hasEventId = interview.getCalendarEventId() != null && !interview.getCalendarEventId().isBlank();
        if (cancelEvent && hasEventId && shouldSyncCalendar(interview, interview.getScheduledAt() != null ? interview.getScheduledAt().toString() : null)) {
            try {
                integrationClient.deleteCalendarEvent(
                    interview.getCalendarProvider(),
                    interview.getCalendarEventId(),
                    UserContext.getUserId(user)
                );
                interview.setCalendarEventId(null);
            } catch (FeignException ex) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.contentUTF8());
            }
        } else if (shouldSyncCalendar(interview, interview.getScheduledAt() != null ? interview.getScheduledAt().toString() : null)) {
            try {
                CalendarEventUpdateRequest updateRequest = buildCalendarUpdateRequest(interview, null, user);
                if (interview.getCalendarEventId() == null || interview.getCalendarEventId().isBlank()) {
                    CalendarEventResponse eventResponse = integrationClient.createCalendarEvent(
                        buildCalendarRequest(interview, interview.getScheduledAt() != null ? interview.getScheduledAt().toString() : null, interview.getDurationMinutes(), null, user, null)
                    );
                    interview.setCalendarEventId(eventResponse.getEventId());
                    if (interview.getMeetingLink() == null && eventResponse.getMeetingLink() != null) {
                        interview.setMeetingLink(eventResponse.getMeetingLink());
                    }
                } else {
                    CalendarEventResponse eventResponse = integrationClient.updateCalendarEvent(
                        interview.getCalendarProvider(),
                        interview.getCalendarEventId(),
                        updateRequest
                    );
                    if (eventResponse.getMeetingLink() != null) {
                        interview.setMeetingLink(eventResponse.getMeetingLink());
                    }
                }
            } catch (FeignException ex) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.contentUTF8());
            }
        }
        interviewRepository.save(interview);
        return ResponseEntity.ok(Map.of("message", "Interview updated"));
    }

    @PostMapping("/{id}/feedback")
    @Transactional
    public ResponseEntity<?> addFeedback(
        @PathVariable String id,
        @RequestBody InterviewFeedbackRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.INTERVIEWER);
        Interview interview = interviewRepository.findById(UUID.fromString(id)).orElse(null);
        if (interview == null) {
            return ResponseEntity.notFound().build();
        }

        InterviewFeedback feedback = new InterviewFeedback();
        feedback.setInterview(interview);
        feedback.setInterviewerId(request.getInterviewerId());
        feedback.setTechnicalScore(request.getTechnicalScore());
        feedback.setCommunicationScore(request.getCommunicationScore());
        feedback.setCulturalScore(request.getCulturalScore());
        feedback.setOverallScore(request.getOverallScore());
        feedback.setStrengths(request.getStrengths());
        feedback.setWeaknesses(request.getWeaknesses());
        feedback.setNotes(request.getNotes());
        feedback.setRecommendation(request.getRecommendation());
        interviewFeedbackRepository.save(feedback);
        interview.setStatus("feedback_submitted");
        interviewRepository.save(interview);

        EvaluationScore score = new EvaluationScore();
        score.setApplicationId(interview.getApplication() != null ? interview.getApplication().getId() : null);
        score.setInterviewId(interview.getId());
        score.setTotalScore(calculateTotalScore(request));
        score.setRecommendation(request.getRecommendation());
        score.setSummary(request.getNotes());
        score.setSubmittedBy(UserContext.getUserId(user));
        score.setSubmittedAt(OffsetDateTime.now());
        if (score.getApplicationId() != null) {
            evaluationScoreRepository.save(score);
        }

        eventService.audit("interview", interview.getId().toString(), "feedback_submitted", UserContext.getUserId(user),
            Map.of("application_id", interview.getApplication() != null ? interview.getApplication().getId() : null));

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", feedback.getId(), "message", "Feedback submitted"));
    }

    private Integer calculateTotalScore(InterviewFeedbackRequest request) {
        int total = 0;
        int count = 0;
        if (request.getTechnicalScore() != null) { total += request.getTechnicalScore(); count++; }
        if (request.getCommunicationScore() != null) { total += request.getCommunicationScore(); count++; }
        if (request.getCulturalScore() != null) { total += request.getCulturalScore(); count++; }
        if (request.getOverallScore() != null) { total += request.getOverallScore(); count++; }
        return count == 0 ? null : Math.round(total / (float) count);
    }

    private boolean shouldSyncCalendar(Interview interview, String scheduledAtRaw) {
        String provider = normalizeProvider(interview.getCalendarProvider());
        return provider != null && !provider.equals("none") && scheduledAtRaw != null && !scheduledAtRaw.isBlank();
    }

    private String normalizeProvider(String provider) {
        if (provider == null) {
            return null;
        }
        String value = provider.trim().toLowerCase();
        return value.isBlank() ? null : value;
    }

    private boolean isCanceled(String status) {
        String value = status.toLowerCase();
        return value.equals("canceled") || value.equals("cancelled");
    }

    private CalendarEventRequest buildCalendarRequest(
        Interview interview,
        String scheduledAtRaw,
        Integer durationMinutes,
        String mode,
        AppUserDetails user,
        List<InterviewCreateRequest.InterviewerRequest> interviewers
    ) {
        CalendarEventRequest request = new CalendarEventRequest();
        request.setProvider(interview.getCalendarProvider());
        request.setOrganizerUserId(UserContext.getUserId(user));
        request.setSummary(buildSummary(interview));
        request.setDescription(buildDescription(interview));
        OffsetDateTime start = scheduledAtRaw != null ? OffsetDateTime.parse(scheduledAtRaw) : interview.getScheduledAt();
        int duration = durationMinutes != null ? durationMinutes : (interview.getDurationMinutes() != null ? interview.getDurationMinutes() : 60);
        OffsetDateTime end = start != null ? start.plusMinutes(duration) : null;
        request.setStartTime(start != null ? start.toString() : null);
        request.setEndTime(end != null ? end.toString() : null);
        request.setTimeZone("UTC");
        request.setLocation(interview.getLocation());
        request.setMeetingLink(interview.getMeetingLink());
        request.setOnlineMeeting(isOnline(mode, interview.getMode()));
        request.setAttendees(resolveAttendees(interview, interviewers));
        return request;
    }

    private CalendarEventUpdateRequest buildCalendarUpdateRequest(Interview interview, String mode, AppUserDetails user) {
        CalendarEventUpdateRequest request = new CalendarEventUpdateRequest();
        request.setOrganizerUserId(UserContext.getUserId(user));
        request.setSummary(buildSummary(interview));
        request.setDescription(buildDescription(interview));
        OffsetDateTime start = interview.getScheduledAt();
        OffsetDateTime end = start != null ? start.plusMinutes(interview.getDurationMinutes() != null ? interview.getDurationMinutes() : 60) : null;
        request.setStartTime(start != null ? start.toString() : null);
        request.setEndTime(end != null ? end.toString() : null);
        request.setTimeZone("UTC");
        request.setLocation(interview.getLocation());
        request.setMeetingLink(interview.getMeetingLink());
        request.setOnlineMeeting(isOnline(mode, interview.getMode()));
        request.setAttendees(resolveAttendees(interview, null));
        return request;
    }

    private boolean isOnline(String mode, InterviewMode fallbackMode) {
        if (mode != null) {
            return "online".equalsIgnoreCase(mode);
        }
        return fallbackMode != null && fallbackMode.getValue().equalsIgnoreCase("online");
    }

    private String buildSummary(Interview interview) {
        CandidateApplication application = interview.getApplication();
        Candidate candidate = application != null ? application.getCandidate() : null;
        String positionTitle = application != null && application.getPosition() != null ? application.getPosition().getTitle() : null;
        StringBuilder summary = new StringBuilder("Interview");
        if (positionTitle != null && !positionTitle.isBlank()) {
            summary.append(": ").append(positionTitle);
        }
        if (candidate != null && candidate.getFullName() != null) {
            summary.append(" - ").append(candidate.getFullName());
        }
        return summary.toString();
    }

    private String buildDescription(Interview interview) {
        CandidateApplication application = interview.getApplication();
        String positionTitle = application != null && application.getPosition() != null ? application.getPosition().getTitle() : null;
        StringBuilder description = new StringBuilder();
        if (positionTitle != null && !positionTitle.isBlank()) {
            description.append("Position: ").append(positionTitle);
        }
        return description.toString();
    }

    private List<String> resolveAttendees(Interview interview, List<InterviewCreateRequest.InterviewerRequest> interviewers) {
        Set<String> emails = new HashSet<>();
        CandidateApplication application = interview.getApplication();
        Candidate candidate = application != null ? application.getCandidate() : null;
        if (candidate != null && candidate.getEmail() != null && !candidate.getEmail().isBlank()) {
            emails.add(candidate.getEmail());
        }
        List<String> interviewerIds = new ArrayList<>();
        if (interviewers != null) {
            for (InterviewCreateRequest.InterviewerRequest req : interviewers) {
                if (req.getInterviewerId() == null || req.getInterviewerId().isBlank()) continue;
                if (req.getInterviewerId().contains("@")) {
                    emails.add(req.getInterviewerId());
                } else {
                    interviewerIds.add(req.getInterviewerId());
                }
            }
        } else if (interview.getInterviewers() != null) {
            for (InterviewPanel panel : interview.getInterviewers()) {
                if (panel.getInterviewerId() == null || panel.getInterviewerId().isBlank()) continue;
                if (panel.getInterviewerId().contains("@")) {
                    emails.add(panel.getInterviewerId());
                } else {
                    interviewerIds.add(panel.getInterviewerId());
                }
            }
        }
        if (!interviewerIds.isEmpty()) {
            try {
                UserLookupResponse response = identityClient.lookupUsers(new UserLookupRequest(interviewerIds));
                if (response != null && response.getData() != null) {
                    for (UserLookupResponse.UserSummary user : response.getData()) {
                        if (user.getEmail() != null && !user.getEmail().isBlank()) {
                            emails.add(user.getEmail());
                        }
                    }
                }
            } catch (Exception ex) {
                // Ignore lookup failures; calendar can be created without extra attendees.
            }
        }
        return emails.stream().toList();
    }
}
