package com.hirepath.recruitment.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.recruitment.client.ApprovalClient;
import com.hirepath.recruitment.client.IntegrationClient;
import com.hirepath.recruitment.client.dto.ApprovalFlowResponse;
import com.hirepath.recruitment.client.dto.ApprovalRequestCreateRequest;
import com.hirepath.recruitment.client.dto.ApprovalRequestCreateResponse;
import com.hirepath.recruitment.client.dto.ApprovalStatusResponse;
import com.hirepath.recruitment.client.dto.InternalApprovalActionRequest;
import com.hirepath.recruitment.client.dto.PublishPostingRequest;
import com.hirepath.recruitment.client.dto.PublishPostingResponse;
import com.hirepath.recruitment.domain.HiringRequest;
import com.hirepath.recruitment.domain.JobPosition;
import com.hirepath.recruitment.domain.JobPosting;
import com.hirepath.recruitment.domain.JobStatus;
import com.hirepath.recruitment.domain.PortalPlatform;
import com.hirepath.recruitment.domain.PostingPlatform;
import com.hirepath.recruitment.domain.PostingPlatformStatus;
import com.hirepath.recruitment.domain.PostingStatus;
import com.hirepath.recruitment.domain.RequestStatus;
import com.hirepath.recruitment.domain.UserRole;
import com.hirepath.recruitment.dto.ApprovalActionRequest;
import com.hirepath.recruitment.dto.HiringRequestCreateRequest;
import com.hirepath.recruitment.dto.InterviewRoundConfig;
import com.hirepath.recruitment.dto.PositionCreateRequest;
import com.hirepath.recruitment.dto.PositionUpdateRequest;
import com.hirepath.recruitment.dto.PostingCreateRequest;
import com.hirepath.recruitment.dto.PostingPublishRequest;
import com.hirepath.recruitment.dto.PostingUpdateRequest;
import com.hirepath.recruitment.repository.CandidateApplicationRepository;
import com.hirepath.recruitment.repository.HiringRequestRepository;
import com.hirepath.recruitment.repository.JobPositionRepository;
import com.hirepath.recruitment.repository.JobPostingRepository;
import com.hirepath.recruitment.repository.PostingPlatformRepository;
import com.hirepath.recruitment.util.UserContext;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import feign.FeignException;

@RestController
@RequestMapping("/api/recruitment")
public class RecruitmentController {

    private final HiringRequestRepository hiringRequestRepository;
    private final JobPositionRepository jobPositionRepository;
    private final JobPostingRepository jobPostingRepository;
    private final PostingPlatformRepository postingPlatformRepository;
    private final CandidateApplicationRepository candidateApplicationRepository;
    private final ApprovalClient approvalClient;
    private final IntegrationClient integrationClient;
    private final ObjectMapper objectMapper;

    public RecruitmentController(
        HiringRequestRepository hiringRequestRepository,
        JobPositionRepository jobPositionRepository,
        JobPostingRepository jobPostingRepository,
        PostingPlatformRepository postingPlatformRepository,
        CandidateApplicationRepository candidateApplicationRepository,
        ApprovalClient approvalClient,
        IntegrationClient integrationClient,
        ObjectMapper objectMapper
    ) {
        this.hiringRequestRepository = hiringRequestRepository;
        this.jobPositionRepository = jobPositionRepository;
        this.jobPostingRepository = jobPostingRepository;
        this.postingPlatformRepository = postingPlatformRepository;
        this.candidateApplicationRepository = candidateApplicationRepository;
        this.approvalClient = approvalClient;
        this.integrationClient = integrationClient;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/hiring-requests")
    public ResponseEntity<?> listHiringRequests(
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "skip", defaultValue = "0") int skip,
        @RequestParam(value = "limit", defaultValue = "20") int limit,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.HIRING_MANAGER, UserRole.EMPLOYEE);

        List<HiringRequest> requests = hiringRequestRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        RequestStatus statusFilter = null;
        if (status != null && !status.isBlank()) {
            try {
                statusFilter = RequestStatus.fromValue(status);
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body("Invalid status");
            }
        }

        String userId = UserContext.getUserId(user);
        String role = UserContext.getRole(user);
        if (UserRole.EMPLOYEE.getValue().equalsIgnoreCase(role)) {
            requests = requests.stream()
                .filter(req -> userId != null && userId.equals(req.getRequestedBy()))
                .toList();
        }
        if (statusFilter != null) {
            RequestStatus finalStatusFilter = statusFilter;
            requests = requests.stream()
                .filter(req -> finalStatusFilter == req.getStatus())
                .toList();
        }

        int total = requests.size();
        int fromIndex = Math.min(skip, total);
        int toIndex = Math.min(fromIndex + limit, total);
        List<HiringRequest> page = requests.subList(fromIndex, toIndex);

        List<Map<String, Object>> data = page.stream().map(req -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", req.getId());
            row.put("job_title", req.getJobTitle());
            row.put("status", req.getStatus() != null ? req.getStatus().getValue() : null);
            row.put("priority", req.getPriority());
            row.put("headcount", req.getHeadcount());
            row.put("created_at", req.getCreatedAt());
            row.put("department_id", req.getDepartmentId());
            row.put("department_name", null);
            row.put("approval_flow_id", req.getApprovalFlowId());
            row.put("approval_request_id", req.getApprovalRequestId());
            row.put("approval_status", fetchApprovalStatus("hiring_request", req.getId().toString()));
            row.put("current_stage", null);
            row.put("can_approve", false);
            row.put("approvals", List.of());
            return row;
        }).toList();

        return ResponseEntity.ok(Map.of("total", total, "data", data));
    }

    @PostMapping("/hiring-requests")
    @Transactional
    public ResponseEntity<?> createHiringRequest(
        @RequestBody HiringRequestCreateRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.HIRING_MANAGER, UserRole.EMPLOYEE);
        if (request.getApprovalFlowId() == null || request.getApprovalFlowId().isBlank()) {
            return ResponseEntity.badRequest().body("approval_flow_id is required");
        }

        ApprovalFlowResponse flow;
        try {
            flow = approvalClient.getFlow(request.getApprovalFlowId());
        } catch (FeignException ex) {
            return ResponseEntity.badRequest().body("Invalid approval flow");
        }
        if (flow == null || !flow.isActive()) {
            return ResponseEntity.badRequest().body("Invalid approval flow");
        }
        if (flow.getStages() == null || flow.getStages().isEmpty()) {
            return ResponseEntity.badRequest().body("Approval flow has no stages");
        }

        boolean isDraft = "draft".equalsIgnoreCase(request.getStatus());
        HiringRequest hiringRequest = new HiringRequest();
        hiringRequest.setJobTitle(request.getJobTitle());
        hiringRequest.setDepartmentId(request.getDepartmentId());
        hiringRequest.setApprovalFlowId(request.getApprovalFlowId());
        hiringRequest.setHiringManagerId(request.getHiringManagerId());
        hiringRequest.setDescription(request.getDescription());
        hiringRequest.setSkills(request.getSkills() != null ? request.getSkills() : new ArrayList<>());
        hiringRequest.setQualifications(request.getQualifications());
        hiringRequest.setExperienceYears(request.getExperienceYears());
        hiringRequest.setSalaryMin(request.getSalaryMin());
        hiringRequest.setSalaryMax(request.getSalaryMax());
        hiringRequest.setHeadcount(request.getHeadcount() != null ? request.getHeadcount() : 1);
        hiringRequest.setPriority(request.getPriority() != null ? request.getPriority() : "medium");
        hiringRequest.setExpectedDate(request.getExpectedDate());
        hiringRequest.setNotes(request.getNotes());
        hiringRequest.setRequestedBy(UserContext.getUserId(user));
        hiringRequest.setStatus(isDraft ? RequestStatus.DRAFT : RequestStatus.PENDING);

        HiringRequest saved = hiringRequestRepository.save(hiringRequest);

        if (!isDraft) {
            try {
                ApprovalRequestCreateRequest approvalRequest = new ApprovalRequestCreateRequest();
                approvalRequest.setFlowId(request.getApprovalFlowId());
                approvalRequest.setModule("recruitment");
                approvalRequest.setEntityType("hiring_request");
                approvalRequest.setEntityId(saved.getId().toString());
                approvalRequest.setTitle("Hiring Request: " + saved.getJobTitle());
                approvalRequest.setSummary(saved.getDescription());
                approvalRequest.setRequesterId(UserContext.getUserId(user));
                approvalRequest.setRequesterName(user != null ? user.getFullName() : null);
                approvalRequest.setPriority(saved.getPriority());
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("job_title", saved.getJobTitle());
                payload.put("department_id", saved.getDepartmentId());
                payload.put("headcount", saved.getHeadcount());
                payload.put("priority", saved.getPriority());
                approvalRequest.setPayloadSnapshot(payload);
                approvalRequest.setSubmit(true);
                ApprovalRequestCreateResponse created = approvalClient.createApprovalRequest(approvalRequest);
                if (created != null && created.getId() != null) {
                    saved.setApprovalRequestId(created.getId());
                    saved.setStatus(RequestStatus.PENDING);
                    hiringRequestRepository.save(saved);
                }
            } catch (FeignException ex) {
                saved.setStatus(RequestStatus.DRAFT);
                hiringRequestRepository.save(saved);
                return ResponseEntity.status(ex.status()).body("Approval service error");
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", saved.getId(), "message", "Hiring request created"));
    }

    @GetMapping("/hiring-requests/{id}")
    public ResponseEntity<?> getHiringRequest(
        @PathVariable String id,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.HIRING_MANAGER, UserRole.EMPLOYEE);
        HiringRequest request = hiringRequestRepository.findWithApprovalsById(UUID.fromString(id)).orElse(null);
        if (request == null) {
            return ResponseEntity.notFound().build();
        }
        String role = UserContext.getRole(user);
        if (UserRole.EMPLOYEE.getValue().equalsIgnoreCase(role)) {
            String userId = UserContext.getUserId(user);
            if (userId == null || !userId.equals(request.getRequestedBy())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not allowed");
            }
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", request.getId());
        payload.put("job_title", request.getJobTitle());
        payload.put("status", request.getStatus() != null ? request.getStatus().getValue() : null);
        payload.put("priority", request.getPriority());
        payload.put("headcount", request.getHeadcount());
        payload.put("department_id", request.getDepartmentId());
        payload.put("department_name", null);
        payload.put("approval_flow_id", request.getApprovalFlowId());
        payload.put("approval_request_id", request.getApprovalRequestId());
        payload.put("created_at", request.getCreatedAt());
        payload.put("position_id", request.getJobPosition() != null ? request.getJobPosition().getId() : null);
        payload.put("position_status", request.getJobPosition() != null && request.getJobPosition().getStatus() != null
            ? request.getJobPosition().getStatus().getValue()
            : null);
        payload.put("approval_status", fetchApprovalStatus("hiring_request", request.getId().toString()));
        payload.put("current_stage", null);
        payload.put("can_approve", false);
        payload.put("approvals", List.of());
        return ResponseEntity.ok(payload);
    }

    @PostMapping("/hiring-requests/{id}/approve")
    @Transactional
    public ResponseEntity<?> approveHiringRequest(
        @PathVariable String id,
        @RequestBody ApprovalActionRequest action,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.HIRING_MANAGER);
        HiringRequest request = hiringRequestRepository.findById(UUID.fromString(id)).orElse(null);
        if (request == null) {
            return ResponseEntity.notFound().build();
        }
        if (request.getApprovalRequestId() == null || request.getApprovalRequestId().isBlank()) {
            return ResponseEntity.badRequest().body("approval_request_id is missing");
        }
        if (action == null || action.getStatus() == null) {
            return ResponseEntity.badRequest().body("status is required");
        }
        InternalApprovalActionRequest internalAction = new InternalApprovalActionRequest();
        internalAction.setAction(action.getStatus());
        internalAction.setComment(action.getComments());
        internalAction.setActorId(UserContext.getUserId(user));
        internalAction.setActorName(user != null ? user.getFullName() : null);
        internalAction.setActorEmail(user != null ? user.getUsername() : null);
        internalAction.setActorRoles(user != null ? user.getRoleNames() : List.of());
        try {
            approvalClient.actOnApproval(request.getApprovalRequestId(), internalAction);
        } catch (FeignException ex) {
            return ResponseEntity.status(ex.status()).body("Approval service error");
        }
        return ResponseEntity.ok(Map.of("message", "Request " + action.getStatus()));
    }

    @GetMapping("/positions")
    public ResponseEntity<?> listPositions(
        @RequestParam(value = "status", required = false) String status,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER, UserRole.HIRING_MANAGER);
        List<JobPosition> positions;
        if (status == null || status.isBlank()) {
            positions = jobPositionRepository.findByStatusNot(JobStatus.ARCHIVED);
        } else if ("all".equalsIgnoreCase(status)) {
            positions = jobPositionRepository.findAll();
        } else {
            try {
                positions = jobPositionRepository.findByStatus(JobStatus.fromValue(status));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body("Invalid status");
            }
        }

        List<Map<String, Object>> data = positions.stream().map(position -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", position.getId());
            row.put("title", position.getTitle());
            row.put("status", position.getStatus() != null ? position.getStatus().getValue() : null);
            row.put("department_id", position.getDepartmentId());
            row.put("department_name", null);
            row.put("assigned_recruiter_id", position.getAssignedRecruiterId());
            row.put("recruiter_name", null);
            row.put("candidates_count", candidateApplicationRepository.countByPosition_Id(position.getId()));
            row.put("posting_status", latestPostingStatus(position.getId()));
            row.put("created_at", position.getCreatedAt());
            row.put("hiring_request_id", position.getHiringRequest() != null ? position.getHiringRequest().getId() : null);
            row.put("level", position.getLevel());
            row.put("hiring_manager_id", position.getHiringManagerId());
            row.put("headcount", position.getHeadcount());
            row.put("target_start_date", position.getTargetStartDate());
            row.put("budget", position.getBudget());
            row.put("approval_flow_id", position.getApprovalFlowId());
            row.put("application_form_id", position.getApplicationFormId());
            row.put("interview_rounds", deserializeRounds(position.getInterviewRounds()));
            return row;
        }).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    @GetMapping("/positions/{id}")
    public ResponseEntity<?> getPosition(@PathVariable String id, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER, UserRole.HIRING_MANAGER);
        JobPosition position = jobPositionRepository.findById(UUID.fromString(id)).orElse(null);
        if (position == null) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", position.getId());
        row.put("title", position.getTitle());
        row.put("status", position.getStatus() != null ? position.getStatus().getValue() : null);
        row.put("department_id", position.getDepartmentId());
        row.put("department_name", null);
        row.put("assigned_recruiter_id", position.getAssignedRecruiterId());
        row.put("recruiter_name", null);
        row.put("candidates_count", candidateApplicationRepository.countByPosition_Id(position.getId()));
        row.put("posting_status", latestPostingStatus(position.getId()));
        row.put("created_at", position.getCreatedAt());
        row.put("hiring_request_id", position.getHiringRequest() != null ? position.getHiringRequest().getId() : null);
        row.put("level", position.getLevel());
        row.put("hiring_manager_id", position.getHiringManagerId());
        row.put("headcount", position.getHeadcount());
        row.put("target_start_date", position.getTargetStartDate());
        row.put("budget", position.getBudget());
        row.put("approval_flow_id", position.getApprovalFlowId());
        row.put("application_form_id", position.getApplicationFormId());
        row.put("interview_rounds", deserializeRounds(position.getInterviewRounds()));
        return ResponseEntity.ok(row);
    }

    @PostMapping("/positions")
    @Transactional
    public ResponseEntity<?> createPosition(@RequestBody PositionCreateRequest request, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER, UserRole.HIRING_MANAGER);

        JobPosition position = new JobPosition();
        position.setTitle(request.getTitle());
        position.setDepartmentId(request.getDepartmentId());
        position.setAssignedRecruiterId(request.getAssignedRecruiterId());
        position.setLevel(request.getLevel());
        position.setHiringManagerId(request.getHiringManagerId());
        position.setHeadcount(request.getHeadcount());
        if (request.getTargetStartDate() != null && !request.getTargetStartDate().isBlank()) {
            position.setTargetStartDate(LocalDate.parse(request.getTargetStartDate()));
        }
        if (request.getBudget() != null && !request.getBudget().isBlank()) {
            try {
                position.setBudget(new BigDecimal(request.getBudget()));
            } catch (NumberFormatException ex) {
                return ResponseEntity.badRequest().body("Invalid budget");
            }
        }
        position.setApprovalFlowId(request.getApprovalFlowId());
        position.setApplicationFormId(request.getApplicationFormId());
        position.setInterviewRounds(serializeRounds(request.getInterviewRounds()));
        if (request.getStatus() != null) {
            try {
                position.setStatus(JobStatus.fromValue(request.getStatus()));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body("Invalid status");
            }
        }

        if (request.getHiringRequestId() != null && !request.getHiringRequestId().isBlank()) {
            UUID hiringRequestId = UUID.fromString(request.getHiringRequestId());
            HiringRequest hiringRequest = hiringRequestRepository.findById(hiringRequestId).orElse(null);
            if (hiringRequest == null) {
                return ResponseEntity.badRequest().body("Invalid hiring_request_id");
            }
            if (jobPositionRepository.findByHiringRequest_Id(hiringRequestId).isPresent()) {
                return ResponseEntity.badRequest().body("Position already exists for this request");
            }
            position.setHiringRequest(hiringRequest);
        }

        JobPosition saved = jobPositionRepository.save(position);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", saved.getId(), "message", "Position created"));
    }

    @PatchMapping("/positions/{id}")
    @Transactional
    public ResponseEntity<?> updatePosition(
        @PathVariable String id,
        @RequestBody PositionUpdateRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER, UserRole.HIRING_MANAGER);
        JobPosition position = jobPositionRepository.findById(UUID.fromString(id)).orElse(null);
        if (position == null) {
            return ResponseEntity.notFound().build();
        }
        if (request.getDepartmentId() != null) {
            position.setDepartmentId(request.getDepartmentId());
        }
        if (request.getAssignedRecruiterId() != null) {
            position.setAssignedRecruiterId(request.getAssignedRecruiterId());
        }
        if (request.getLevel() != null) {
            position.setLevel(request.getLevel());
        }
        if (request.getHiringManagerId() != null) {
            position.setHiringManagerId(request.getHiringManagerId());
        }
        if (request.getHeadcount() != null) {
            position.setHeadcount(request.getHeadcount());
        }
        if (request.getTargetStartDate() != null) {
            position.setTargetStartDate(request.getTargetStartDate().isBlank() ? null : LocalDate.parse(request.getTargetStartDate()));
        }
        if (request.getBudget() != null) {
            if (request.getBudget().isBlank()) {
                position.setBudget(null);
            } else {
                try {
                    position.setBudget(new BigDecimal(request.getBudget()));
                } catch (NumberFormatException ex) {
                    return ResponseEntity.badRequest().body("Invalid budget");
                }
            }
        }
        if (request.getApprovalFlowId() != null) {
            position.setApprovalFlowId(request.getApprovalFlowId());
        }
        if (request.getApplicationFormId() != null) {
            position.setApplicationFormId(request.getApplicationFormId());
        }
        if (request.getInterviewRounds() != null) {
            position.setInterviewRounds(serializeRounds(request.getInterviewRounds()));
        }
        if (request.getTitle() != null) {
            position.setTitle(request.getTitle());
        }
        if (request.getStatus() != null) {
            try {
                position.setStatus(JobStatus.fromValue(request.getStatus()));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body("Invalid status");
            }
        }
        jobPositionRepository.save(position);
        return ResponseEntity.ok(Map.of("message", "Position updated"));
    }

    @GetMapping("/postings")
    public ResponseEntity<?> listPostings(@AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER, UserRole.HIRING_MANAGER);
        List<JobPosting> postings = jobPostingRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Map<String, Object>> data = postings.stream().map(this::postingSummary).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    @GetMapping("/postings/{id}")
    public ResponseEntity<?> getPosting(@PathVariable String id, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER, UserRole.HIRING_MANAGER);
        JobPosting posting = jobPostingRepository.findWithPlatformsById(UUID.fromString(id)).orElse(null);
        if (posting == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(postingDetail(posting));
    }

    @PostMapping("/postings")
    @Transactional
    public ResponseEntity<?> createPosting(@RequestBody PostingCreateRequest request, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER, UserRole.HIRING_MANAGER);
        if (request.getPositionId() == null || request.getPositionId().isBlank()) {
            return ResponseEntity.badRequest().body("Invalid position_id");
        }
        JobPosition position = jobPositionRepository.findById(UUID.fromString(request.getPositionId())).orElse(null);
        if (position == null) {
            return ResponseEntity.badRequest().body("Invalid position_id");
        }

        JobPosting posting = new JobPosting();
        posting.setPosition(position);
        posting.setTitle(request.getTitle() != null ? request.getTitle() : position.getTitle());
        posting.setDescription(request.getDescription());
        posting.setRequirements(request.getRequirements());
        posting.setLocation(request.getLocation());
        posting.setJobType(request.getJobType());
        posting.setWorkMode(request.getWorkMode());
        posting.setSalaryRange(request.getSalaryRange());
        posting.setDeadline(request.getDeadline());
        posting.setStatus(PostingStatus.DRAFT);

        JobPosting saved = jobPostingRepository.save(posting);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", saved.getId(), "message", "Posting created"));
    }

    @PatchMapping("/postings/{id}")
    @Transactional
    public ResponseEntity<?> updatePosting(
        @PathVariable String id,
        @RequestBody PostingUpdateRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER, UserRole.HIRING_MANAGER);
        JobPosting posting = jobPostingRepository.findById(UUID.fromString(id)).orElse(null);
        if (posting == null) {
            return ResponseEntity.notFound().build();
        }
        if (posting.getStatus() != PostingStatus.DRAFT && posting.getStatus() != PostingStatus.FAILED) {
            return ResponseEntity.badRequest().body("Posting cannot be edited");
        }
        if (request.getTitle() != null) posting.setTitle(request.getTitle());
        if (request.getDescription() != null) posting.setDescription(request.getDescription());
        if (request.getRequirements() != null) posting.setRequirements(request.getRequirements());
        if (request.getLocation() != null) posting.setLocation(request.getLocation());
        if (request.getJobType() != null) posting.setJobType(request.getJobType());
        if (request.getWorkMode() != null) posting.setWorkMode(request.getWorkMode());
        if (request.getSalaryRange() != null) posting.setSalaryRange(request.getSalaryRange());
        if (request.getDeadline() != null) posting.setDeadline(request.getDeadline());
        jobPostingRepository.save(posting);
        return ResponseEntity.ok(Map.of("message", "Posting updated"));
    }

    @PostMapping("/postings/{id}/publish")
    @Transactional
    public ResponseEntity<?> publishPosting(
        @PathVariable String id,
        @RequestBody PostingPublishRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER, UserRole.HIRING_MANAGER);
        JobPosting posting = jobPostingRepository.findWithPlatformsById(UUID.fromString(id)).orElse(null);
        if (posting == null) {
            return ResponseEntity.notFound().build();
        }
        if (posting.getStatus() != PostingStatus.DRAFT && posting.getStatus() != PostingStatus.FAILED) {
            return ResponseEntity.badRequest().body("Posting cannot be published");
        }
        if (request.getPlatforms() == null || request.getPlatforms().isEmpty()) {
            return ResponseEntity.badRequest().body("At least one platform is required");
        }

        List<PortalPlatform> platforms;
        try {
            platforms = request.getPlatforms().stream()
                .map(PortalPlatform::fromValue)
                .toList();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }

        posting.setStatus(PostingStatus.PUBLISHING);
        posting.setPlatforms(platforms.stream().map(PortalPlatform::getValue).toList());
        jobPostingRepository.save(posting);

        for (PortalPlatform platform : platforms) {
            PostingPlatform meta = postingPlatformRepository
                .findByPosting_IdAndPlatform(posting.getId(), platform)
                .orElseGet(PostingPlatform::new);
            meta.setPosting(posting);
            meta.setPlatform(platform);
            meta.setStatus(PostingPlatformStatus.PENDING);
            meta.setErrorMessage(null);
            meta.setExternalId(null);
            meta.setExternalUrl(null);
            meta.setPostedAt(null);
            postingPlatformRepository.save(meta);
        }

        PublishPostingResponse publishResponse;
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("id", posting.getId().toString());
            payload.put("title", posting.getTitle());
            payload.put("description", posting.getDescription());
            payload.put("location", posting.getLocation());
            payload.put("job_type", posting.getJobType());
            payload.put("work_mode", posting.getWorkMode());
            payload.put("salary_range", posting.getSalaryRange());
            publishResponse = integrationClient.publish(new PublishPostingRequest(payload, request.getPlatforms()));
        } catch (FeignException ex) {
            posting.setStatus(PostingStatus.FAILED);
            jobPostingRepository.save(posting);
            return ResponseEntity.status(ex.status()).body(ex.contentUTF8());
        }

        boolean allSuccess = true;
        if (publishResponse != null && publishResponse.getResults() != null) {
            for (PublishPostingResponse.Result result : publishResponse.getResults()) {
                PortalPlatform platform;
                try {
                    platform = PortalPlatform.fromValue(result.getPlatform());
                } catch (IllegalArgumentException ex) {
                    allSuccess = false;
                    continue;
                }
                PostingPlatform meta = postingPlatformRepository
                    .findByPosting_IdAndPlatform(posting.getId(), platform)
                    .orElseGet(PostingPlatform::new);
                meta.setPosting(posting);
                meta.setPlatform(platform);
                if ("published".equalsIgnoreCase(result.getStatus())) {
                    meta.setStatus(PostingPlatformStatus.PUBLISHED);
                    meta.setExternalUrl(result.getExternalUrl());
                    meta.setPostedAt(OffsetDateTime.now());
                } else {
                    meta.setStatus(PostingPlatformStatus.FAILED);
                    meta.setErrorMessage(result.getErrorMessage());
                    allSuccess = false;
                }
                postingPlatformRepository.save(meta);
            }
        } else {
            allSuccess = false;
        }

        if (allSuccess) {
            posting.setStatus(PostingStatus.PUBLISHED);
            posting.setPublishedAt(OffsetDateTime.now());
        } else {
            posting.setStatus(PostingStatus.FAILED);
        }
        jobPostingRepository.save(posting);

        return ResponseEntity.ok(Map.of("message", "Publishing started"));
    }

    @PostMapping("/postings/{id}/close")
    @Transactional
    public ResponseEntity<?> closePosting(@PathVariable String id, @AuthenticationPrincipal AppUserDetails user) {
        UserContext.requireRole(user, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.RECRUITER, UserRole.HIRING_MANAGER);
        JobPosting posting = jobPostingRepository.findById(UUID.fromString(id)).orElse(null);
        if (posting == null) {
            return ResponseEntity.notFound().build();
        }
        posting.setStatus(PostingStatus.CLOSED);
        jobPostingRepository.save(posting);
        return ResponseEntity.ok(Map.of("message", "Posting closed"));
    }

    private String serializeRounds(List<InterviewRoundConfig> rounds) {
        if (rounds == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(rounds);
        } catch (Exception ex) {
            return null;
        }
    }

    private List<InterviewRoundConfig> deserializeRounds(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(raw, new TypeReference<List<InterviewRoundConfig>>() {});
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String latestPostingStatus(UUID positionId) {
        return jobPostingRepository.findTopByPosition_IdOrderByCreatedAtDesc(positionId)
            .map(posting -> posting.getStatus() != null ? posting.getStatus().getValue() : null)
            .orElse(null);
    }

    private String fetchApprovalStatus(String entityType, String entityId) {
        try {
            ApprovalStatusResponse status = approvalClient.getApprovalStatus("recruitment", entityType, entityId);
            return status != null ? status.getStatus() : null;
        } catch (FeignException.NotFound ex) {
            return null;
        } catch (FeignException ex) {
            return null;
        }
    }

    private Map<String, Object> postingSummary(JobPosting posting) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", posting.getId());
        row.put("title", posting.getTitle());
        row.put("status", posting.getStatus() != null ? posting.getStatus().getValue() : null);
        row.put("location", posting.getLocation());
        row.put("work_mode", posting.getWorkMode());
        row.put("job_type", posting.getJobType());
        row.put("deadline", posting.getDeadline());
        row.put("published_at", posting.getPublishedAt());
        row.put("position_id", posting.getPosition() != null ? posting.getPosition().getId() : null);
        row.put("position_title", posting.getPosition() != null ? posting.getPosition().getTitle() : null);
        row.put("platforms", posting.getPlatformsMeta().stream().map(this::platformSummary).toList());
        return row;
    }

    private Map<String, Object> postingDetail(JobPosting posting) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", posting.getId());
        row.put("title", posting.getTitle());
        row.put("description", posting.getDescription());
        row.put("requirements", posting.getRequirements());
        row.put("location", posting.getLocation());
        row.put("job_type", posting.getJobType());
        row.put("work_mode", posting.getWorkMode());
        row.put("salary_range", posting.getSalaryRange());
        row.put("status", posting.getStatus() != null ? posting.getStatus().getValue() : null);
        row.put("deadline", posting.getDeadline());
        row.put("published_at", posting.getPublishedAt());
        row.put("position_id", posting.getPosition() != null ? posting.getPosition().getId() : null);
        row.put("position_title", posting.getPosition() != null ? posting.getPosition().getTitle() : null);
        row.put("platforms", posting.getPlatformsMeta().stream().map(this::platformSummary).toList());
        return row;
    }

    private Map<String, Object> platformSummary(PostingPlatform platform) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("platform", platform.getPlatform() != null ? platform.getPlatform().getValue() : null);
        row.put("status", platform.getStatus() != null ? platform.getStatus().getValue() : null);
        row.put("external_url", platform.getExternalUrl());
        row.put("posted_at", platform.getPostedAt());
        return row;
    }
}
