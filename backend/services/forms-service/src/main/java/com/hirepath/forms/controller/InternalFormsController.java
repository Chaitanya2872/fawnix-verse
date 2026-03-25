package com.hirepath.forms.controller;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.hirepath.forms.domain.ApplicationForm;
import com.hirepath.forms.domain.ApplicationFormField;
import com.hirepath.forms.domain.ApplicationFormStatus;
import com.hirepath.forms.repository.ApplicationFormRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/forms")
public class InternalFormsController {

    private final ApplicationFormRepository formRepository;

    public InternalFormsController(ApplicationFormRepository formRepository) {
        this.formRepository = formRepository;
    }

    @GetMapping("/{slug}")
    public ResponseEntity<?> getPublishedForm(@PathVariable String slug) {
        ApplicationForm form = formRepository
            .findPublishedBySlug(slug, ApplicationFormStatus.PUBLISHED, "recruitment")
            .orElse(null);
        if (form == null) {
            return ResponseEntity.notFound().build();
        }
        List<ApplicationFormField> fields = form.getFields().stream()
            .sorted(Comparator.comparing(f -> f.getOrderIndex() == null ? 0 : f.getOrderIndex()))
            .toList();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", form.getId());
        payload.put("name", form.getName());
        payload.put("description", form.getDescription());
        payload.put("status", form.getStatus() != null ? form.getStatus().name().toLowerCase() : null);
        payload.put("public_slug", form.getPublicSlug());
        payload.put("position_id", form.getPositionId());
        payload.put("module", form.getModule());
        payload.put("fields", fields.stream().map(field -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("field_key", field.getFieldKey());
            row.put("label", field.getLabel());
            row.put("type", field.getType() != null ? field.getType().name().toLowerCase() : null);
            row.put("required", field.isRequired());
            row.put("options", field.getOptions());
            row.put("config", field.getConfig() != null ? field.getConfig() : Map.of());
            row.put("order", field.getOrderIndex());
            return row;
        }).toList());
        return ResponseEntity.ok(payload);
    }
}
