package com.hirepath.forms.controller;

import java.util.Map;

import com.hirepath.forms.dto.InternalFormSubmissionRequest;
import com.hirepath.forms.service.FormSubmissionService;
import com.hirepath.forms.service.FormSubmissionService.SubmissionResult;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/forms")
public class InternalFormSubmissionsController {

    private final FormSubmissionService submissionService;

    public InternalFormSubmissionsController(FormSubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PostMapping("/submissions")
    public ResponseEntity<?> createSubmission(@RequestBody InternalFormSubmissionRequest request) {
        try {
            SubmissionResult result = submissionService.createSubmission(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", result.id(),
                "deduplicated", result.deduplicated()
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.GONE).body(ex.getMessage());
        }
    }
}
