package com.hirepath.recruitment.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class OfferCreateRequest {
    private String applicationId;
    private String approvalFlowId;
    private String baseSalary;
    private String bonus;
    private String equity;
    private String benefits;
    private String joiningDate;
    private String offerExpiry;
    private String terms;

    public String getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(String applicationId) {
        this.applicationId = applicationId;
    }

    public String getApprovalFlowId() {
        return approvalFlowId;
    }

    public void setApprovalFlowId(String approvalFlowId) {
        this.approvalFlowId = approvalFlowId;
    }

    public String getBaseSalary() {
        return baseSalary;
    }

    public void setBaseSalary(String baseSalary) {
        this.baseSalary = baseSalary;
    }

    public String getBonus() {
        return bonus;
    }

    public void setBonus(String bonus) {
        this.bonus = bonus;
    }

    public String getEquity() {
        return equity;
    }

    public void setEquity(String equity) {
        this.equity = equity;
    }

    public String getBenefits() {
        return benefits;
    }

    public void setBenefits(String benefits) {
        this.benefits = benefits;
    }

    public String getJoiningDate() {
        return joiningDate;
    }

    public void setJoiningDate(String joiningDate) {
        this.joiningDate = joiningDate;
    }

    public String getOfferExpiry() {
        return offerExpiry;
    }

    public void setOfferExpiry(String offerExpiry) {
        this.offerExpiry = offerExpiry;
    }

    public String getTerms() {
        return terms;
    }

    public void setTerms(String terms) {
        this.terms = terms;
    }
}

