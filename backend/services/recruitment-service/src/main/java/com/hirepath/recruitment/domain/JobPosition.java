package com.hirepath.recruitment.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "job_positions")
public class JobPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "hiring_request_id")
    private HiringRequest hiringRequest;

    @Column(nullable = false)
    private String title;

    @Column(name = "department_id")
    private String departmentId;

    @Column(name = "assigned_recruiter_id")
    private String assignedRecruiterId;

    private String level;

    @Column(name = "hiring_manager_id")
    private String hiringManagerId;

    private Integer headcount;

    @Column(name = "target_start_date")
    private LocalDate targetStartDate;

    private BigDecimal budget;

    @Column(name = "approval_flow_id")
    private String approvalFlowId;

    @Column(name = "application_form_id")
    private String applicationFormId;

    @Column(name = "interview_rounds", columnDefinition = "TEXT")
    private String interviewRounds;

    @Enumerated(EnumType.STRING)
    private JobStatus status = JobStatus.OPEN;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @OneToMany(mappedBy = "position", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<JobPosting> postings = new ArrayList<>();

    @OneToMany(mappedBy = "position", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CandidateApplication> applications = new ArrayList<>();

    public UUID getId() {
        return id;
    }

    public HiringRequest getHiringRequest() {
        return hiringRequest;
    }

    public void setHiringRequest(HiringRequest hiringRequest) {
        this.hiringRequest = hiringRequest;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(String departmentId) {
        this.departmentId = departmentId;
    }

    public String getAssignedRecruiterId() {
        return assignedRecruiterId;
    }

    public void setAssignedRecruiterId(String assignedRecruiterId) {
        this.assignedRecruiterId = assignedRecruiterId;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public String getHiringManagerId() {
        return hiringManagerId;
    }

    public void setHiringManagerId(String hiringManagerId) {
        this.hiringManagerId = hiringManagerId;
    }

    public Integer getHeadcount() {
        return headcount;
    }

    public void setHeadcount(Integer headcount) {
        this.headcount = headcount;
    }

    public LocalDate getTargetStartDate() {
        return targetStartDate;
    }

    public void setTargetStartDate(LocalDate targetStartDate) {
        this.targetStartDate = targetStartDate;
    }

    public BigDecimal getBudget() {
        return budget;
    }

    public void setBudget(BigDecimal budget) {
        this.budget = budget;
    }

    public String getApprovalFlowId() {
        return approvalFlowId;
    }

    public void setApprovalFlowId(String approvalFlowId) {
        this.approvalFlowId = approvalFlowId;
    }

    public String getApplicationFormId() {
        return applicationFormId;
    }

    public void setApplicationFormId(String applicationFormId) {
        this.applicationFormId = applicationFormId;
    }

    public String getInterviewRounds() {
        return interviewRounds;
    }

    public void setInterviewRounds(String interviewRounds) {
        this.interviewRounds = interviewRounds;
    }

    public JobStatus getStatus() {
        return status;
    }

    public void setStatus(JobStatus status) {
        this.status = status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public List<JobPosting> getPostings() {
        return postings;
    }

    public void setPostings(List<JobPosting> postings) {
        this.postings = postings;
    }

    public List<CandidateApplication> getApplications() {
        return applications;
    }

    public void setApplications(List<CandidateApplication> applications) {
        this.applications = applications;
    }
}
