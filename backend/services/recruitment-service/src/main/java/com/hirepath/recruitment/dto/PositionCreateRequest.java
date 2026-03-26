package com.hirepath.recruitment.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PositionCreateRequest {
    private String title;
    private String departmentId;
    private String assignedRecruiterId;
    private String level;
    private String hiringManagerId;
    private Integer headcount;
    private String targetStartDate;
    private String budget;
    private String approvalFlowId;
    private String applicationFormId;
    private java.util.List<InterviewRoundConfig> interviewRounds;
    private String status = "open";
    private String hiringRequestId;

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

    public String getTargetStartDate() {
        return targetStartDate;
    }

    public void setTargetStartDate(String targetStartDate) {
        this.targetStartDate = targetStartDate;
    }

    public String getBudget() {
        return budget;
    }

    public void setBudget(String budget) {
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

    public java.util.List<InterviewRoundConfig> getInterviewRounds() {
        return interviewRounds;
    }

    public void setInterviewRounds(java.util.List<InterviewRoundConfig> interviewRounds) {
        this.interviewRounds = interviewRounds;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getHiringRequestId() {
        return hiringRequestId;
    }

    public void setHiringRequestId(String hiringRequestId) {
        this.hiringRequestId = hiringRequestId;
    }
}
