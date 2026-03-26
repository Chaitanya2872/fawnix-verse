package com.hirepath.recruitment.controller;

import java.util.Map;
import java.util.UUID;

import com.hirepath.recruitment.domain.CandidateIntake;
import com.hirepath.recruitment.domain.IntakeStatus;
import com.hirepath.recruitment.dto.InternalIntakeRequest;
import com.hirepath.recruitment.repository.CandidateIntakeRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/recruitment/intake")
public class InternalIntakeController {

    private final CandidateIntakeRepository intakeRepository;

    public InternalIntakeController(CandidateIntakeRepository intakeRepository) {
        this.intakeRepository = intakeRepository;
    }

    @PostMapping("/from-submission")
    @Transactional
    public ResponseEntity<?> createFromSubmission(@RequestBody InternalIntakeRequest request) {
        if (request == null || request.getVacancyId() == null || request.getEmail() == null) {
            return ResponseEntity.badRequest().body("vacancy_id and email are required");
        }
        CandidateIntake intake = new CandidateIntake();
        intake.setVacancyId(UUID.fromString(request.getVacancyId()));
        intake.setFormSubmissionId(request.getFormSubmissionId() != null && !request.getFormSubmissionId().isBlank()
            ? UUID.fromString(request.getFormSubmissionId()) : null);
        intake.setFormId(request.getFormId());
        intake.setCandidateName(request.getCandidateName());
        intake.setEmail(request.getEmail());
        intake.setPhone(request.getPhone());
        intake.setResumeUrl(request.getResumeUrl());
        intake.setSource(request.getSource());
        intake.setStatus(IntakeStatus.NEW);
        intake.setDedupeHash(intake.getVacancyId() + ":" + request.getEmail().trim().toLowerCase());
        CandidateIntake saved = intakeRepository.save(intake);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", saved.getId()));
    }
}
