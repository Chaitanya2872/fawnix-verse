package com.hirepath.recruitment.client;

import com.hirepath.recruitment.client.dto.FormDetailResponse;
import com.hirepath.recruitment.client.dto.InternalFormSubmissionRequest;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "forms-service", dismiss404 = true)
public interface FormsClient {

    @GetMapping("/internal/forms/{slug}")
    FormDetailResponse getFormBySlug(@PathVariable("slug") String slug);

    @PostMapping("/internal/forms/submissions")
    Map<String, Object> createSubmission(@RequestBody InternalFormSubmissionRequest request);
}
