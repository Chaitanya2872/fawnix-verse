package com.hirepath.recruitment.client;

import com.hirepath.recruitment.client.dto.FormDetailResponse;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "forms-service", dismiss404 = true)
public interface FormsClient {

    @GetMapping("/internal/forms/{slug}")
    FormDetailResponse getFormBySlug(@PathVariable("slug") String slug);
}
